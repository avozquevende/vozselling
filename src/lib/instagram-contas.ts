import { getDb } from "./db";

// Conta do Instagram conectada por workspace. O webhook da Meta identifica
// de qual conta uma mensagem veio pelo instagram_business_id (o entry.id
// do payload) — é essa tabela que traduz isso para um workspace_id.

export interface ContaInstagram {
  workspace_id: number;
  instagram_business_id: string;
  instagram_username: string | null;
  access_token: string;
  token_expira_em: string;
}

export async function salvarConta(
  workspaceId: number,
  conta: { instagramBusinessId: string; instagramUsername?: string; accessToken: string; expiraEm: Date },
): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO contas_instagram (workspace_id, instagram_business_id, instagram_username, access_token, token_expira_em)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(workspace_id) DO UPDATE SET
         instagram_business_id = excluded.instagram_business_id,
         instagram_username = excluded.instagram_username,
         access_token = excluded.access_token,
         token_expira_em = excluded.token_expira_em`,
    )
    .run(
      workspaceId,
      conta.instagramBusinessId,
      conta.instagramUsername ?? null,
      conta.accessToken,
      conta.expiraEm.toISOString(),
    );
}

export async function contaPorWorkspace(workspaceId: number): Promise<ContaInstagram | undefined> {
  const db = await getDb();
  return db.prepare("SELECT * FROM contas_instagram WHERE workspace_id = ?").get<ContaInstagram>(workspaceId);
}

/** Usado pelo webhook: entry.id do payload é o instagram_business_id. */
export async function contaPorInstagramBusinessId(
  instagramBusinessId: string,
): Promise<ContaInstagram | undefined> {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM contas_instagram WHERE instagram_business_id = ?")
    .get<ContaInstagram>(instagramBusinessId);
}
