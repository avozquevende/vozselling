import { getDb } from "./db";
import { type Papel, ehPapelValido } from "./papeis";

export interface Etapa {
  id: number;
  workspace_id: number;
  nome: string;
  papel: Papel;
  ordem: number;
}

// Funil padrão do produto (handoff, seção 06). O cliente pode renomear,
// reordenar ou criar etapas novas — isto é só o que nasce com o workspace.
const FUNIL_PADRAO: Array<{ nome: string; papel: Papel; ordem: number }> = [
  { nome: "Ranking", papel: "fila", ordem: 0 },
  { nome: "Prospecção", papel: "prepara", ordem: 1 },
  { nome: "Adição", papel: "prepara", ordem: 2 },
  { nome: "Conexão", papel: "conduz", ordem: 3 },
  { nome: "Condução", papel: "conduz", ordem: 4 },
  { nome: "Convite", papel: "conduz", ordem: 5 },
  { nome: "Agendamento", papel: "encerra", ordem: 6 },
  { nome: "Acompanhamento", papel: "encerra", ordem: 7 },
  { nome: "Nutrição", papel: "nutre", ordem: 8 },
];

function toEtapa(row: unknown): Etapa {
  const r = row as {
    id: number;
    workspace_id: number;
    nome: string;
    papel: string;
    ordem: number;
  };
  if (!ehPapelValido(r.papel)) {
    throw new Error(`Etapa ${r.id} tem papel inválido no banco: ${r.papel}`);
  }
  return { ...r, papel: r.papel };
}

export async function etapasDoWorkspace(workspaceId: number): Promise<Etapa[]> {
  const db = await getDb();
  const rows = await db
    .prepare(
      "SELECT id, workspace_id, nome, papel, ordem FROM etapas WHERE workspace_id = ? ORDER BY ordem ASC",
    )
    .all(workspaceId);
  return rows.map(toEtapa);
}

/** Idempotente: cria o funil padrão só se o workspace ainda não tiver etapas. */
export async function garantirEtapasPadrao(workspaceId: number): Promise<Etapa[]> {
  const db = await getDb();
  const existentes = await etapasDoWorkspace(workspaceId);
  if (existentes.length > 0) return existentes;

  await db.transaction(
    FUNIL_PADRAO.map((etapa) => ({
      sql: "INSERT INTO etapas (workspace_id, nome, papel, ordem) VALUES (?, ?, ?, ?)",
      args: [workspaceId, etapa.nome, etapa.papel, etapa.ordem],
    })),
  );

  return etapasDoWorkspace(workspaceId);
}

export async function etapaPorId(etapaId: number): Promise<Etapa | undefined> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT id, workspace_id, nome, papel, ordem FROM etapas WHERE id = ?")
    .get(etapaId);
  return row ? toEtapa(row) : undefined;
}

/** A pergunta certa: qual o papel desta etapa — nunca "qual o nome dela". */
export async function papelDaEtapa(etapaId: number): Promise<Papel | undefined> {
  const etapa = await etapaPorId(etapaId);
  return etapa?.papel;
}

export async function moverLeadParaEtapa(leadId: number, etapaId: number): Promise<void> {
  const db = await getDb();
  await db
    .prepare("UPDATE leads SET etapa_id = ?, atualizado_em = datetime('now','localtime') WHERE id = ?")
    .run(etapaId, leadId);
}
