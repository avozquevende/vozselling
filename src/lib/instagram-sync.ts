import { getDb } from "./db";
import { garantirEtapasPadrao } from "./etapas";
import { buscarUsername, enviarMensagemDireta } from "./instagram-api";
import { contaPorWorkspace, type ContaInstagram } from "./instagram-contas";

// Grava uma mensagem recebida via Instagram Messaging API — chamado pelo
// webhook (src/app/api/webhooks/instagram) a cada DM nova. É o que alimenta
// a fila do piloto (ultimo_falante='lead' + janela_24h_expira_em).

async function buscarLeadPorIgsid(workspaceId: number, igsid: string): Promise<number | undefined> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT id FROM leads WHERE workspace_id = ? AND instagram_scoped_id = ?")
    .get<{ id: number }>(workspaceId, igsid);
  return row?.id;
}

/** Só chamado quando o IGSID ainda não tem lead — resolve o username antes. */
async function encontrarOuCriarLead(conta: ContaInstagram, igsid: string, username: string): Promise<number> {
  const db = await getDb();

  // Pode já existir um lead criado manualmente (ex: via Ranking) sem o
  // IGSID ainda resolvido — backfilla em vez de duplicar.
  const existentePorUsername = await db
    .prepare("SELECT id FROM leads WHERE workspace_id = ? AND instagram_username = ?")
    .get<{ id: number }>(conta.workspace_id, username);
  if (existentePorUsername) {
    await db.prepare("UPDATE leads SET instagram_scoped_id = ? WHERE id = ?").run(igsid, existentePorUsername.id);
    return existentePorUsername.id;
  }

  const etapas = await garantirEtapasPadrao(conta.workspace_id);
  const etapaFila = etapas.find((e) => e.papel === "fila");
  const resultado = await db
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
  const conta = await contaPorWorkspace(workspaceId);
  if (!conta) return;
  await enviarMensagemDireta(conta.access_token, conta.instagram_business_id, instagramScopedId, texto);
}

/**
 * Atraso anti-bloqueio antes do piloto poder responder (spec do Dream Social
 * real, seção "ritmo"): resposta instantânea a cada mensagem é o padrão nº1
 * que a Meta reconhece como bot. Primeira resposta da conversa espera mais
 * (30s–3min, imita alguém abrindo o app); trocas seguintes esperam pouco
 * (5–45s, a pessoa já está "na tela").
 */
function jitterSegundos(primeiraResposta: boolean): number {
  const [min, max] = primeiraResposta ? [30, 180] : [5, 45];
  return min + Math.floor(Math.random() * (max - min + 1));
}

export async function processarMensagemRecebida(
  conta: ContaInstagram,
  igsid: string,
  texto: string,
): Promise<void> {
  const db = await getDb();
  let leadId = await buscarLeadPorIgsid(conta.workspace_id, igsid);
  if (leadId === undefined) {
    const username = await buscarUsername(conta.access_token, igsid);
    leadId = await encontrarOuCriarLead(conta, igsid, username);
  }

  const leadAtual = await db
    .prepare("SELECT mensagens_robo_count FROM leads WHERE id = ?")
    .get<{ mensagens_robo_count: number }>(leadId);
  const segundos = jitterSegundos((leadAtual?.mensagens_robo_count ?? 0) === 0);

  await db.transaction([
    { sql: "INSERT INTO mensagens (lead_id, remetente, texto) VALUES (?, 'lead', ?)", args: [leadId, texto] },
    {
      sql: `UPDATE leads
            SET ultimo_falante = 'lead',
                janela_24h_expira_em = datetime('now','localtime','+24 hours'),
                proximo_toque_liberado_em = datetime('now','localtime', ?),
                atualizado_em = datetime('now','localtime')
            WHERE id = ?`,
      args: [`+${segundos} seconds`, leadId],
    },
  ]);
}
