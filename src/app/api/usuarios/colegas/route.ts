import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

// Lista leve (id, nome) dos operadores de um workspace — só o suficiente
// para popular o seletor de "responsável" no Pipeline, sem expor email/papel
// como a rota de admin faz.
export async function GET(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const workspaceIdParam = request.nextUrl.searchParams.get("workspaceId");
    const workspaceId = workspaceIdParam ? Number(workspaceIdParam) : usuario.workspace_id;
    if (!workspaceId) throw new ErroApi(400, "workspaceId é obrigatório.");
    requireWorkspaceAccess(usuario, workspaceId);

    const db = await getDb();
    const usuarios = await db
      .prepare("SELECT id, nome FROM usuarios WHERE workspace_id = ? ORDER BY nome ASC")
      .all(workspaceId);

    return NextResponse.json({ usuarios });
  } catch (err) {
    return erroParaResposta(err);
  }
}
