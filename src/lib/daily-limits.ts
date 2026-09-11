import { getDb } from "./db";

// Freios de volume (spec, seção 05). O maior risco do produto não é
// converter pouco, é a conta ser bloqueada — por isso só o que o time
// INICIA (prospecção) gasta cota. Responder quem já procurou o cliente
// (comentou, mandou DM) é atendimento, e atendimento não tem teto.
//
// Contagem sempre em datetime('now','localtime') — new Date().toISOString()
// é UTC e, no Brasil depois das 21h, já fez o contador virar o dia seguinte
// antes da hora (armadilha registrada no handoff, seção 9).

export type TipoAcao = "adicao" | "follow" | "resposta" | "comentario";

const TETO_RESPOSTAS_HORA = 40; // ~1 a cada 90s — ritmo de gente atendendo, não de robô

export interface LimitesWorkspace {
  workspace_id: number;
  teto_adicoes_dia: number;
  teto_follows_dia: number;
}

export function limitesDoWorkspace(workspaceId: number): LimitesWorkspace {
  const db = getDb();
  const row = db
    .prepare("SELECT workspace_id, teto_adicoes_dia, teto_follows_dia FROM limites_workspace WHERE workspace_id = ?")
    .get(workspaceId) as LimitesWorkspace | undefined;

  if (row) return row;

  // Sem linha configurada ainda: usa o padrão da coluna sem gravar nada.
  return { workspace_id: workspaceId, teto_adicoes_dia: 50, teto_follows_dia: 50 };
}

export function definirLimitesDoWorkspace(
  workspaceId: number,
  limites: { tetoAdicoesDia: number; tetoFollowsDia: number },
): void {
  getDb()
    .prepare(
      `INSERT INTO limites_workspace (workspace_id, teto_adicoes_dia, teto_follows_dia)
       VALUES (?, ?, ?)
       ON CONFLICT(workspace_id) DO UPDATE SET
         teto_adicoes_dia = excluded.teto_adicoes_dia,
         teto_follows_dia = excluded.teto_follows_dia`,
    )
    .run(workspaceId, limites.tetoAdicoesDia, limites.tetoFollowsDia);
}

function contarAcoesDesde(workspaceId: number, tipo: TipoAcao, desde: string): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total FROM acoes_prospeccao
       WHERE workspace_id = ? AND tipo = ? AND criado_em >= datetime('now','localtime', ?)`,
    )
    .get(workspaceId, tipo, desde) as { total: number };
  return row.total;
}

function contarAcoesHoje(workspaceId: number, tipo: TipoAcao): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total FROM acoes_prospeccao
       WHERE workspace_id = ? AND tipo = ?
         AND date(criado_em) = date('now','localtime')`,
    )
    .get(workspaceId, tipo) as { total: number };
  return row.total;
}

export interface VerificacaoLimite {
  liberado: boolean;
  usado: number;
  teto: number;
}

export function podeAdicionar(workspaceId: number): VerificacaoLimite {
  const teto = limitesDoWorkspace(workspaceId).teto_adicoes_dia;
  const usado = contarAcoesHoje(workspaceId, "adicao");
  return { liberado: usado < teto, usado, teto };
}

export function podeSeguir(workspaceId: number): VerificacaoLimite {
  const teto = limitesDoWorkspace(workspaceId).teto_follows_dia;
  const usado = contarAcoesHoje(workspaceId, "follow");
  return { liberado: usado < teto, usado, teto };
}

/** Respostas do robô/operador não têm teto diário, só ritmo por hora. */
export function podeResponderAgora(workspaceId: number): VerificacaoLimite {
  const usado = contarAcoesDesde(workspaceId, "resposta", "-1 hours");
  return { liberado: usado < TETO_RESPOSTAS_HORA, usado, teto: TETO_RESPOSTAS_HORA };
}

/** Comentário automático conta como atendimento (não gasta cota de prospecção). */
export function registrarAcao(workspaceId: number, tipo: TipoAcao): void {
  getDb()
    .prepare("INSERT INTO acoes_prospeccao (workspace_id, tipo) VALUES (?, ?)")
    .run(workspaceId, tipo);
}
