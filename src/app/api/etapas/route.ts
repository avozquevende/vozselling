import { NextRequest, NextResponse } from "next/server";
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

    const etapas = garantirEtapasPadrao(workspaceId);
    return NextResponse.json({ etapas });
  } catch (err) {
    return erroParaResposta(err);
  }
}
