import { gerarTexto } from "./llm";
import { getDb } from "./db";
import { buscarSecao } from "./metodologia";

// Qualificação do lead — nota 0 a 100 (spec, seção 03). A mensagem que a
// pessoa mandou diz mais de intenção que qualquer bio, então quando existe
// DM ela pesa mais que o perfil na análise.

export type FaixaNota = "perfeito" | "forte" | "parcial" | "fraco" | "fora";

export interface ClassificacaoNota {
  faixa: FaixaNota;
  acao:
    | "abordar_hoje"
    | "cadencia_do_dia"
    | "abordar_se_sobrar_capacidade"
    | "nutrir_sem_abordagem"
    | "descartar"
    | "so_nutrir";
}

/**
 * Concorrente tem os mesmos sinais bonitos do cliente ideal — por isso não
 * usa a tabela normal: mesmo com nota baixa, a ação é "só nutrir", nunca
 * "descartar" (ele ainda é alguém do mercado, só não é lead).
 */
export function classificarNota(
  nota: number,
  opcoes?: { concorrente?: boolean },
): ClassificacaoNota {
  const notaClamped = Math.max(0, Math.min(100, Math.round(nota)));

  if (opcoes?.concorrente && notaClamped < 30) {
    return { faixa: "fora", acao: "so_nutrir" };
  }
  if (notaClamped >= 90) return { faixa: "perfeito", acao: "abordar_hoje" };
  if (notaClamped >= 70) return { faixa: "forte", acao: "cadencia_do_dia" };
  if (notaClamped >= 50) return { faixa: "parcial", acao: "abordar_se_sobrar_capacidade" };
  if (notaClamped >= 30) return { faixa: "fraco", acao: "nutrir_sem_abordagem" };
  return { faixa: "fora", acao: "descartar" };
}

export interface DadosParaAnalise {
  icp: string;
  ofertas: string;
  bio?: string;
  posts?: string;
  seguidores?: number;
  mensagemDireta?: string;
}

export interface ResultadoAnalise {
  nota: number;
  motivo: string;
  concorrente: boolean;
}

// A régua de faixas abaixo é estrutural — não muda por método (é o que
// classificarNota() também aplica em código, então os dois precisam bater).
// O que o método do Filippe acrescenta (buscarSecao) é a camada de cima:
// como ler os sinais, o que pesa mais, os exemplos — não a régua em si.
async function montarSistema(): Promise<string> {
  const base = `Você analisa perfis do Instagram para qualificar leads de vendas.
Responda SEMPRE em JSON puro, sem markdown, no formato:
{"nota": <0 a 100>, "motivo": "<uma frase curta e concreta>", "concorrente": <true|false>}

Faixas (regra fixa, não muda):
- Nota 90-100: encaixe perfeito com o ICP + sinal quente + budget visível.
- Nota 70-89: encaixe forte, sem sinal quente.
- Nota 50-69: encaixe parcial (falta budget ou consciência do problema).
- Nota 30-49: encaixe fraco.
- Nota 0-29: fora do alvo, ou concorrente, ou em regra de exclusão explícita.
- A mensagem direta (quando existir) diz mais sobre intenção do que a bio — pese mais nela.
- Bio profissional e público idêntico ao ICP não são, sozinhos, sinal de nota alta: também é a cara de um concorrente do mesmo mercado. Marque "concorrente": true quando o perfil parecer alguém que vende o mesmo tipo de coisa, não alguém que compraria.`;

  const [qualificacao, tomDeVoz] = await Promise.all([buscarSecao("qualificacao"), buscarSecao("tom_de_voz")]);
  const partesMetodo = [qualificacao, tomDeVoz].filter(Boolean);
  if (partesMetodo.length === 0) return base;

  return `${base}\n\n--- Como qualificar, segundo o método (aplique junto com as faixas acima) ---\n${partesMetodo.join("\n\n")}`;
}

function montarPrompt(dados: DadosParaAnalise): string {
  const partes = [
    `ICP (perfil de cliente ideal): ${dados.icp}`,
    `Ofertas do negócio: ${dados.ofertas}`,
  ];
  if (dados.bio) partes.push(`Bio do perfil: ${dados.bio}`);
  if (dados.posts) partes.push(`Resumo dos últimos posts: ${dados.posts}`);
  if (dados.seguidores !== undefined) partes.push(`Seguidores: ${dados.seguidores}`);
  if (dados.mensagemDireta) partes.push(`Mensagem que a pessoa mandou: "${dados.mensagemDireta}"`);
  return partes.join("\n");
}

export async function analisarLead(dados: DadosParaAnalise): Promise<ResultadoAnalise> {
  const modelo = process.env.A1_MODEL ?? "gpt-4o-mini";
  const resposta = await gerarTexto({
    modelo,
    sistema: await montarSistema(),
    prompt: montarPrompt(dados),
    temperatura: 0.2,
  });

  const json = extrairJson(resposta);
  return {
    nota: Math.max(0, Math.min(100, Math.round(Number(json.nota) || 0))),
    motivo: String(json.motivo ?? "").slice(0, 300),
    concorrente: Boolean(json.concorrente),
  };
}

function extrairJson(texto: string): { nota?: number; motivo?: string; concorrente?: boolean } {
  const bloco = texto.match(/\{[\s\S]*\}/);
  if (!bloco) throw new Error(`Resposta da IA sem JSON reconhecível: ${texto.slice(0, 200)}`);
  return JSON.parse(bloco[0]);
}

/**
 * Analisa um lead já cadastrado usando o ICP/ofertas do workspace e a
 * última mensagem dele (quando existir), e grava nota/motivo/concorrente
 * de volta no lead — é o que a tela de Ranking dispara.
 */
export async function analisarEQualificarLead(leadId: number): Promise<ResultadoAnalise> {
  const db = await getDb();

  const lead = await db
    .prepare(
      `SELECT l.id, l.workspace_id, w.icp, w.ofertas
       FROM leads l
       JOIN workspaces w ON w.id = l.workspace_id
       WHERE l.id = ?`,
    )
    .get<{ id: number; workspace_id: number; icp: string; ofertas: string }>(leadId);
  if (!lead) throw new Error(`Lead ${leadId} não encontrado.`);

  const ultimaMensagem = await db
    .prepare(
      "SELECT texto FROM mensagens WHERE lead_id = ? AND remetente = 'lead' ORDER BY criado_em DESC LIMIT 1",
    )
    .get<{ texto: string }>(leadId);

  const resultado = await analisarLead({
    icp: lead.icp,
    ofertas: lead.ofertas,
    mensagemDireta: ultimaMensagem?.texto,
  });

  await db
    .prepare(
      `UPDATE leads
       SET nota = ?, motivo_nota = ?, concorrente = ?, atualizado_em = datetime('now','localtime')
       WHERE id = ?`,
    )
    .run(resultado.nota, resultado.motivo, resultado.concorrente ? 1 : 0, leadId);

  return resultado;
}
