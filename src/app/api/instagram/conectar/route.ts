import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { gerarUrlAutorizacao } from "@/lib/instagram-oauth";
import { erroParaResposta } from "@/lib/api-utils";

// Inicia a conexão da conta do Instagram de um workspace. O state carrega
// o workspaceId para o callback saber onde salvar o token — fluxo iniciado
// só por quem já está logado e tem acesso àquele workspace.
export async function GET(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const workspaceIdParam = request.nextUrl.searchParams.get("workspaceId");
    const workspaceId = workspaceIdParam ? Number(workspaceIdParam) : usuario.workspace_id;
    if (!workspaceId) throw new ErroApi(400, "workspaceId é obrigatório.");
    requireWorkspaceAccess(usuario, workspaceId);

    const url = gerarUrlAutorizacao(String(workspaceId));
    return NextResponse.redirect(url);
  } catch (err) {
    return erroParaResposta(err);
  }
}
