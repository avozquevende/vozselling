import { getDb } from "./db";
import { garantirEtapasPadrao } from "./etapas";
import { buscarUsername, enviarMensagemDireta } from "./instagram-api";
import { contaPorWorkspace, type ContaInstagram } from "./instagram-contas";

// Grava uma mensagem recebida via Instagram Messaging API — chamado pelo
// webhook (src/app/api/webhooks/instagram) a cada DM nova. É o que alimenta
// a fila do piloto (ultimo_falante='lead' + janela_24h_expira_em).

function buscarLeadPorIgsid(workspaceId: number, igsid: string): number | undefined {
  const row = getDb()
    .prepare("SELECT id FROM leads WHERE workspace_id = ? AND instagram_scoped_id = ?")
    .get(workspaceId, igsid) as { id: number } | undefined;
  return row?.id;
}

/** Só chamado quando o IGSID ainda não tem lead — resolve o username antes. */
function encontrarOuCriarLead(conta: ContaInstagram, igsid: string, username: string): number {
  const db = getDb();

  // Pode já existir um lead criado manualmente (ex: via Ranking) sem o
  // IGSID ainda resolvido — backfilla em vez de duplicar.
  const existentePorUsername = db
    .prepare("SELECT id FROM leads WHERE workspace_id = ? AND instagram_username = ?")
    .get(conta.workspace_id, username) as { id: number } | undefined;
  if (existentePorUsername) {
    db.prepare("UPDATE leads SET instagram_scoped_id = ? WHERE id = ?").run(
      igsid,
      existentePorUsername.id,
    );
    return existentePorUsername.id;
  }

  const etapaFila = garantirEtapasPadrao(conta.workspace_id).find((e) => e.papel === "fila");
  const resultado = db
    .prepare(
      `INSERT INTO leads (workspace_id, etapa_id, instagram_username, instagram_scoped_id)
       VALUES (?, ?, ?, ?)`,
    )
    .run(conta.workspace_id, etapaFila?.id ?? null, username, igsid);
  return Number(resultado.lastInsertRowid);
}

/**
 * Manda de verdade pelo Instagram quando há conta conectada. Sem conta
 * conectada (ainda sem chave da Meta, ou workspace de teste), não faz nada —
 * quem chama continua registrando a mensagem localmente do mesmo jeito, só
 * não sai pro Instagram de verdade.
 */
export async function enviarParaLead(
  workspaceId: number,
  instagramScopedId: string | null,
  texto: string,
): Promise<void> {
  if (!instagramScopedId) return; // lead nunca mandou DM — não tem pra quem enviar ainda
  const conta = contaPorWorkspace(workspaceId);
  if (!conta) return;
  await enviarMensagemDireta(conta.access_token, conta.instagram_business_id, instagramScopedId, texto);
}

export async function processarMensagemRecebida(
  conta: ContaInstagram,
  igsid: string,
  texto: string,
): Promise<void> {
  const db = getDb();
  let leadId = buscarLeadPorIgsid(conta.workspace_id, igsid);
  if (leadId === undefined) {
    const username = await buscarUsername(conta.access_token, igsid);
    leadId = encontrarOuCriarLead(conta, igsid, username);
  }

  const transacao = db.transaction(() => {
    db.prepare("INSERT INTO mensagens (lead_id, remetente, texto) VALUES (?, 'lead', ?)").run(
      leadId,
      texto,
    );
    db.prepare(
      `UPDATE leads
       SET ultimo_falante = 'lead',
           janela_24h_expira_em = datetime('now','localtime','+24 hours'),
           atualizado_em = datetime('now','localtime')
       WHERE id = ?`,
    ).run(leadId);
  });
  transacao();
}
