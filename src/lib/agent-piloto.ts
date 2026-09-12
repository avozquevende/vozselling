import { getDb } from "./db";
import { gerarTexto } from "./llm";
import {
  type ModoConversa,
  janelaProximaDeExpirar,
  modoDaProximaMensagem,
  podeConvidar,
  roboAutorizadoNaEtapa,
  type LeadNaFila,
} from "./piloto";
import { etapasDoWorkspace, moverLeadParaEtapa } from "./etapas";
import { enviarParaLead } from "./instagram-sync";
import { buscarSecao } from "./metodologia";
import { avaliarUltimaMensagem } from "./travas-conversa";

const INSTRUCAO_POR_MODO: Record<ModoConversa, string> = {
  conexao:
    "Modo CONEXÃO: construir relação, zero venda. Pergunte sobre a pessoa, o conteúdo dela, comente algo genuíno. Não mencione produto, oferta ou convite.",
  conducao:
    "Modo CONDUÇÃO: sondagem, entender a dor. Faça perguntas abertas sobre o problema/contexto dela. Ainda sem oferecer nada. Se ela perguntar o que você faz, responda direto (duas ou três linhas, sem inventar preço/prazo/formato que não esteja em <ofertas>) e só depois convide — mudar de assunto quando ela pergunta é ignorar quem levantou a mão.",
  convite:
    "Modo CONVITE: agora sim, convide para uma conversa/chamada, de forma natural, sem parecer script. Se vier objeção (preço, 'já tentei antes', 'vou pensar'), isso não é recusa — é obstáculo pra call, não motivo pra desistir. Concorda com o que ela disse e devolve a pergunta pro que ela ainda quer (nunca argumenta preço, nunca defende valor no Direct). A objeção de fundo se resolve NA CALL, não aqui.",
  agendamento:
    "Modo AGENDAMENTO: ofereça 2 horários concretos para a conversa. Nunca deixe em aberto ('quando puder'). Horário aceito sozinho não fecha o agendamento — sem um contato direto (WhatsApp) combinado, ainda é convite: peça o WhatsApp como parte de confirmar o horário, nunca depois.",
  excedeu_regua:
    "A régua da conversa acabou. Não gere mensagem — o lead deve voltar para o operador humano.",
};

const SISTEMA_BASE = `Você escreve mensagens de Instagram Direct como se fosse a pessoa dona do perfil (não como assistente).
Frase curta, tom humano e falado, nunca em blocos longos — no máximo 3 blocos, e só o último termina em pergunta (nunca pergunta em cada bloco).
Nunca inicia se apresentando como IA, mas se o lead perguntar diretamente ("você é um robô?", "isso é automático?") NUNCA negue — a Meta reprova esse comportamento no review e é falta grave de política depois. Admita com naturalidade e continue a conversa normalmente, sem se desculpar por isso.
Nunca fala preço, valor, forma de pagamento ou contrato no Direct, mesmo se perguntado direto — isso é do humano, na call.
Siga estritamente o modo indicado abaixo — ele diz o que pode e o que não pode ainda.`;

/**
 * INSTRUCAO_POR_MODO é a regra estrutural da régua (o que pode/não pode
 * ainda) — nunca muda por método. O conteúdo do Filippe (buscarSecao) entra
 * por cima: script, exemplos, forma de perguntar — a voz, não a régua.
 */
async function montarSistema(
  modo: Exclude<ModoConversa, "excedeu_regua">,
  janelaCurta: boolean,
): Promise<string> {
  let base = `${SISTEMA_BASE}\n\n${INSTRUCAO_POR_MODO[modo]}`;
  if (janelaCurta && (modo === "conexao" || modo === "conducao")) {
    base += `\n\nFaltam menos de 6h para a janela de resposta do Instagram fechar. Não dá mais tempo pra sondar com calma: avance e convide para a conversa/call agora, mesmo que ainda esteja cedo na régua.`;
  }
  const [tomDeVoz, doMetodo] = await Promise.all([buscarSecao("tom_de_voz"), buscarSecao(modo)]);
  const partes = [tomDeVoz, doMetodo].filter(Boolean);
  if (partes.length === 0) return base;
  return `${base}\n\n--- Como fazer isso, segundo o método ---\n${partes.join("\n\n")}`;
}

interface HistoricoItem {
  remetente: "lead" | "robo" | "operador";
  texto: string;
}

function montarPrompt(lead: LeadNaFila, historico: HistoricoItem[]): string {
  const conversa = historico
    .map((m) => `${m.remetente === "lead" ? "Lead" : "Você"}: ${m.texto}`)
    .join("\n");
  return `Conversa até agora:\n${conversa}\n\nEscreva a próxima mensagem, só o texto dela.`;
}

async function buscarHistorico(leadId: number): Promise<HistoricoItem[]> {
  const db = await getDb();
  return db
    .prepare("SELECT remetente, texto FROM mensagens WHERE lead_id = ? ORDER BY criado_em ASC")
    .all<HistoricoItem>(leadId);
}

export interface ResultadoPiloto {
  status: "mensagem_gerada" | "devolvido_ao_operador" | "robo_nao_autorizado";
  texto?: string;
  modo?: ModoConversa;
  motivo?: string;
}

/**
 * Decide e gera a próxima ação do robô para um lead da fila do piloto.
 * Não confia apenas na fila (buscarFilaDoPiloto): reconfere aqui que a
 * etapa atual ainda autoriza o robô a falar — ela pode ter mudado entre a
 * leitura da fila e o processamento.
 */
export async function processarProximaMensagem(lead: LeadNaFila): Promise<ResultadoPiloto> {
  if (!(await roboAutorizadoNaEtapa(lead.etapa_id))) {
    return { status: "robo_nao_autorizado" };
  }

  const historico = await buscarHistorico(lead.id);

  // Trava de conversa em código (ver travas-conversa.ts): olha só a última
  // mensagem do lead — é o gatilho mais recente que importa, não o
  // histórico inteiro. Determinístico, não depende do LLM obedecer.
  const ultimaDoLead = [...historico].reverse().find((m) => m.remetente === "lead");
  const trava = ultimaDoLead ? avaliarUltimaMensagem(ultimaDoLead.texto) : null;
  if (trava) {
    await devolverAoOperador(lead);
    if (trava === "raiva") await desativarPiloto(lead.id);
    return { status: "devolvido_ao_operador", motivo: trava };
  }

  const modo = modoDaProximaMensagem(lead.mensagens_robo_count);

  if (modo === "excedeu_regua") {
    await devolverAoOperador(lead);
    return { status: "devolvido_ao_operador", modo };
  }

  if (modo === "convite" && !podeConvidar(lead.mensagens_robo_count)) {
    // Não deve acontecer (a régua já garante isso), mas nunca convida cedo.
    return { status: "robo_nao_autorizado", modo };
  }

  const janelaCurta = await janelaProximaDeExpirar(lead);
  const sistema = await montarSistema(modo, janelaCurta);
  const texto = await gerarTexto({
    modelo: process.env.A3_MODEL ?? "gpt-4o-mini",
    sistema,
    prompt: montarPrompt(lead, historico),
    temperatura: 0.8,
  });

  // Se tem conta conectada, manda de verdade antes de registrar — assim
  // mensagens_robo_count/ultimo_falante só avançam se a mensagem realmente
  // saiu (uma falha de envio aqui joga o erro pra cima, sem gravar nada).
  await enviarParaLead(lead.workspace_id, lead.instagram_scoped_id, texto);
  await registrarMensagemDoRobo(lead.id, texto);
  return { status: "mensagem_gerada", texto, modo };
}

async function registrarMensagemDoRobo(leadId: number, texto: string): Promise<void> {
  const db = await getDb();
  await db.transaction([
    { sql: "INSERT INTO mensagens (lead_id, remetente, texto) VALUES (?, 'robo', ?)", args: [leadId, texto] },
    {
      sql: `UPDATE leads
            SET mensagens_robo_count = mensagens_robo_count + 1,
                ultimo_falante = 'robo',
                atualizado_em = datetime('now','localtime')
            WHERE id = ?`,
      args: [leadId],
    },
  ]);
}

/** Passou da régua (15ª+), ou uma trava de conversa disparou: sai das mãos do robô, primeira etapa de papel "encerra". */
async function devolverAoOperador(lead: LeadNaFila): Promise<void> {
  const etapas = await etapasDoWorkspace(lead.workspace_id);
  const etapaDestino = etapas.find((e) => e.papel === "encerra");
  if (etapaDestino) {
    await moverLeadParaEtapa(lead.id, etapaDestino.id);
  }
}

/** Trava de raiva/"pediu pra parar": desliga o piloto pra este lead até um humano religar manualmente. */
async function desativarPiloto(leadId: number): Promise<void> {
  const db = await getDb();
  await db.prepare("UPDATE leads SET piloto_desativado = 1 WHERE id = ?").run(leadId);
}
