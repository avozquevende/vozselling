import { getDb } from "./db";
import { gerarTexto } from "./llm";
import {
  type ModoConversa,
  modoDaProximaMensagem,
  podeConvidar,
  roboAutorizadoNaEtapa,
  type LeadNaFila,
} from "./piloto";
import { etapasDoWorkspace, moverLeadParaEtapa } from "./etapas";
import { enviarParaLead } from "./instagram-sync";
import { buscarSecao } from "./metodologia";

const INSTRUCAO_POR_MODO: Record<ModoConversa, string> = {
  conexao:
    "Modo CONEXÃO: construir relação, zero venda. Pergunte sobre a pessoa, o conteúdo dela, comente algo genuíno. Não mencione produto, oferta ou convite.",
  conducao:
    "Modo CONDUÇÃO: sondagem, entender a dor. Faça perguntas abertas sobre o problema/contexto dela. Ainda sem oferecer nada.",
  convite:
    "Modo CONVITE: agora sim, convide para uma conversa/chamada, de forma natural, sem parecer script.",
  agendamento:
    "Modo AGENDAMENTO: ofereça 2 horários concretos para a conversa. Nunca deixe em aberto ('quando puder').",
  excedeu_regua:
    "A régua da conversa acabou. Não gere mensagem — o lead deve voltar para o operador humano.",
};

const SISTEMA_BASE = `Você escreve mensagens de Instagram Direct como se fosse a pessoa dona do perfil (não como assistente).
Frase curta, tom humano e falado, nunca em blocos longos. Nunca se identifique como IA.
Siga estritamente o modo indicado abaixo — ele diz o que pode e o que não pode ainda.`;

/**
 * INSTRUCAO_POR_MODO é a regra estrutural da régua (o que pode/não pode
 * ainda) — nunca muda por método. O conteúdo do Filippe (buscarSecao) entra
 * por cima: script, exemplos, forma de perguntar — a voz, não a régua.
 */
function montarSistema(modo: Exclude<ModoConversa, "excedeu_regua">): string {
  const base = `${SISTEMA_BASE}\n\n${INSTRUCAO_POR_MODO[modo]}`;
  const tomDeVoz = buscarSecao("tom_de_voz");
  const doMetodo = buscarSecao(modo);
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

function buscarHistorico(leadId: number): HistoricoItem[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT remetente, texto FROM mensagens WHERE lead_id = ? ORDER BY criado_em ASC",
    )
    .all(leadId) as HistoricoItem[];
}

export interface ResultadoPiloto {
  status: "mensagem_gerada" | "devolvido_ao_operador" | "robo_nao_autorizado";
  texto?: string;
  modo?: ModoConversa;
}

/**
 * Decide e gera a próxima ação do robô para um lead da fila do piloto.
 * Não confia apenas na fila (buscarFilaDoPiloto): reconfere aqui que a
 * etapa atual ainda autoriza o robô a falar — ela pode ter mudado entre a
 * leitura da fila e o processamento.
 */
export async function processarProximaMensagem(lead: LeadNaFila): Promise<ResultadoPiloto> {
  if (!roboAutorizadoNaEtapa(lead.etapa_id)) {
    return { status: "robo_nao_autorizado" };
  }

  const modo = modoDaProximaMensagem(lead.mensagens_robo_count);

  if (modo === "excedeu_regua") {
    devolverAoOperador(lead);
    return { status: "devolvido_ao_operador", modo };
  }

  if (modo === "convite" && !podeConvidar(lead.mensagens_robo_count)) {
    // Não deve acontecer (a régua já garante isso), mas nunca convida cedo.
    return { status: "robo_nao_autorizado", modo };
  }

  const historico = buscarHistorico(lead.id);
  const sistema = montarSistema(modo);
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
  registrarMensagemDoRobo(lead.id, texto);
  return { status: "mensagem_gerada", texto, modo };
}

function registrarMensagemDoRobo(leadId: number, texto: string): void {
  const db = getDb();
  const transacao = db.transaction(() => {
    db.prepare(
      "INSERT INTO mensagens (lead_id, remetente, texto) VALUES (?, 'robo', ?)",
    ).run(leadId, texto);
    db.prepare(
      `UPDATE leads
       SET mensagens_robo_count = mensagens_robo_count + 1,
           ultimo_falante = 'robo',
           atualizado_em = datetime('now','localtime')
       WHERE id = ?`,
    ).run(leadId);
  });
  transacao();
}

/** Passou da régua (15ª+): sai das mãos do robô, primeira etapa de papel "encerra". */
function devolverAoOperador(lead: LeadNaFila): void {
  const etapaDestino = etapasDoWorkspace(lead.workspace_id).find((e) => e.papel === "encerra");
  if (etapaDestino) {
    moverLeadParaEtapa(lead.id, etapaDestino.id);
  }
}
