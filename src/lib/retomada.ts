import { getDb } from "./db";
import { etapasDoWorkspace, moverLeadParaEtapa } from "./etapas";

// Régua de retomada: 7 follow-ups por etapa/motivo, cada uma com fala e
// ritmo próprios (spec, seção 04). O contador zera quando o lead avança —
// cada degrau do funil ganha fôlego novo. Depois do 7º toque sem resposta,
// o lead vira nutrição: presença de longo prazo, sem prazo e sem cobrança.

export type Escada =
  | "ativacao_nao_respondeu"
  | "conexao_esfriou"
  | "conducao_sentiu_venda"
  | "agendamento"
  | "proposta_aberta"
  | "sem_caixa"
  | "nao_prioridade";

export interface DefinicaoEscada {
  escada: Escada;
  rotulo: string;
  comoFala: string;
  /** 7 valores: dias até o próximo toque a partir do anterior (frações = horas). */
  intervalosDias: [number, number, number, number, number, number, number];
}

export const ESCADAS: Record<Escada, DefinicaoEscada> = {
  ativacao_nao_respondeu: {
    escada: "ativacao_nao_respondeu",
    rotulo: "Ativação · não respondeu",
    comoFala:
      "Presença no perfil antes de pedir. Aquece comentando o conteúdo dela, tenta uma adição nova por outro gancho — nunca repete o mesmo pedido.",
    intervalosDias: [1, 1, 1, 1, 1, 1, 1],
  },
  conexao_esfriou: {
    escada: "conexao_esfriou",
    rotulo: "Conexão · esfriou",
    comoFala:
      "Puxa pelo assunto que ela trouxe antes. Nunca recomeça do zero, nunca cobra resposta.",
    intervalosDias: [1, 2, 3, 4, 5, 7, 10],
  },
  conducao_sentiu_venda: {
    escada: "conducao_sentiu_venda",
    rotulo: "Condução · sentiu venda e recuou",
    comoFala:
      "Recuo e valor. Zero pergunta de qualificação — agora toda pergunta confirma o medo dela.",
    intervalosDias: [2, 3, 4, 5, 6, 7, 7],
  },
  agendamento: {
    escada: "agendamento",
    rotulo: "Agendando / Agendado",
    comoFala:
      "Lembrete de horário: sempre com 2 opções concretas. Nunca deixa em aberto.",
    intervalosDias: [2 / 24, 4 / 24, 1, 1, 1, 1, 1],
  },
  proposta_aberta: {
    escada: "proposta_aberta",
    rotulo: "Proposta aberta",
    comoFala:
      "Segue falando do produto — valor, prova, objeção provável — até ela se posicionar. Não remarca reunião.",
    intervalosDias: [1, 1, 1, 1, 1, 1, 1],
  },
  sem_caixa: {
    escada: "sem_caixa",
    rotulo: "Sem caixa",
    comoFala: "Timing, não objeção. Presença sem pitch, volta com data concreta.",
    intervalosDias: [30, 30, 30, 30, 30, 30, 30],
  },
  nao_prioridade: {
    escada: "nao_prioridade",
    rotulo: "Não é prioridade",
    comoFala: "Nutrição longa: existir para não ser esquecida.",
    intervalosDias: [90, 90, 90, 90, 90, 90, 90],
  },
};

export function definicaoEscada(escada: Escada): DefinicaoEscada {
  return ESCADAS[escada];
}

export interface ItemRetomada {
  id: number;
  lead_id: number;
  instagram_scoped_id: string | null;
  escada: Escada;
  passo: number;
  proximo_toque_em: string;
}

/** Zera qualquer retomada ativa do lead e começa uma nova escada do passo 1. */
export function entrarNaFilaDeRetomada(leadId: number, escada: Escada): void {
  const db = getDb();
  const intervaloPrimeiroToque = ESCADAS[escada].intervalosDias[0];
  const transacao = db.transaction(() => {
    db.prepare("UPDATE retomada_fila SET ativo = 0 WHERE lead_id = ? AND ativo = 1").run(leadId);
    db.prepare(
      `INSERT INTO retomada_fila (lead_id, escada, passo, proximo_toque_em, ativo)
       VALUES (?, ?, 1, datetime('now','localtime', ?), 1)`,
    ).run(leadId, escada, `+${intervaloPrimeiroToque} days`);
  });
  transacao();
}

/** O lead respondeu ou avançou de etapa: a régua de retomada não se aplica mais. */
export function zerarRetomada(leadId: number): void {
  getDb()
    .prepare("UPDATE retomada_fila SET ativo = 0 WHERE lead_id = ? AND ativo = 1")
    .run(leadId);
}

export function buscarProntosParaToque(workspaceId: number): ItemRetomada[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.id, r.lead_id, l.instagram_scoped_id, r.escada, r.passo, r.proximo_toque_em
       FROM retomada_fila r
       JOIN leads l ON l.id = r.lead_id
       WHERE l.workspace_id = ?
         AND r.ativo = 1
         AND r.proximo_toque_em <= datetime('now','localtime')
       ORDER BY r.proximo_toque_em ASC`,
    )
    .all(workspaceId);
  return rows as ItemRetomada[];
}

/**
 * Avança um passo na escada. No 7º sem resposta, a régua acaba: o lead vira
 * nutrição (presença de longo prazo) em vez de insistir mais — insistir não
 * traz ninguém e arrisca a conta.
 */
export function avancarPasso(item: ItemRetomada, workspaceId: number): void {
  const db = getDb();
  const definicao = ESCADAS[item.escada];

  if (item.passo >= 7) {
    const transacao = db.transaction(() => {
      db.prepare("UPDATE retomada_fila SET ativo = 0 WHERE id = ?").run(item.id);
      const etapaNutricao = etapasDoWorkspace(workspaceId).find((e) => e.papel === "nutre");
      if (etapaNutricao) moverLeadParaEtapa(item.lead_id, etapaNutricao.id);
    });
    transacao();
    return;
  }

  const proximoPasso = item.passo + 1;
  const intervalo = definicao.intervalosDias[proximoPasso - 1];
  db.prepare(
    `UPDATE retomada_fila
     SET passo = ?, proximo_toque_em = datetime('now','localtime', ?)
     WHERE id = ?`,
  ).run(proximoPasso, `+${intervalo} days`, item.id);
}
