import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { garantirEtapasPadrao } from "@/lib/etapas";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const workspaceIdParam = request.nextUrl.searchParams.get("workspaceId");
    const workspaceId = workspaceIdParam ? Number(workspaceIdParam) : usuario.workspace_id;
    if (!workspaceId) throw new ErroApi(400, "workspaceId é obrigatório.");
    requireWorkspaceAccess(usuario, workspaceId);

    const leads = getDb()
      .prepare(
        `SELECT l.id, l.instagram_username, l.nome, l.nota, l.motivo_nota, l.concorrente,
                l.motivo_parada, l.mensagens_robo_count, l.ultimo_falante, l.atualizado_em,
                e.id AS etapa_id, e.nome AS etapa_nome, e.papel AS etapa_papel
         FROM leads l
         LEFT JOIN etapas e ON e.id = l.etapa_id
         WHERE l.workspace_id = ?
         ORDER BY l.atualizado_em DESC`,
      )
      .all(workspaceId);

    return NextResponse.json({ leads });
  } catch (err) {
    return erroParaResposta(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const body = (await request.json()) as {
      workspaceId?: number;
      instagramUsername?: string;
      nome?: string;
    };
    if (!body.workspaceId || !body.instagramUsername) {
      throw new ErroApi(400, "workspaceId e instagramUsername são obrigatórios.");
    }
    requireWorkspaceAccess(usuario, body.workspaceId);

    const etapas = garantirEtapasPadrao(body.workspaceId);
    const etapaFila = etapas.find((e) => e.papel === "fila");

    const db = getDb();
    const resultado = db
      .prepare(
        `INSERT INTO leads (workspace_id, etapa_id, instagram_username, nome)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(workspace_id, instagram_username) DO NOTHING`,
      )
      .run(body.workspaceId, etapaFila?.id ?? null, body.instagramUsername, body.nome ?? null);

    return NextResponse.json({ criado: resultado.changes > 0 }, { status: 201 });
  } catch (err) {
    return erroParaResposta(err);
  }
}
