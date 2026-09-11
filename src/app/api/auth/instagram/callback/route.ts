import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { trocarCodigoPorToken } from "@/lib/instagram-oauth";
import { buscarUsername } from "@/lib/instagram-api";
import { salvarConta } from "@/lib/instagram-contas";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    if (!code || !state) throw new ErroApi(400, "code e state são obrigatórios.");

    const workspaceId = Number(state);
    requireWorkspaceAccess(usuario, workspaceId);

    const token = await trocarCodigoPorToken(code);

    let instagramUsername: string | undefined;
    try {
      instagramUsername = await buscarUsername(token.accessToken, token.instagramUserId);
    } catch {
      // Segue sem username resolvido — não impede salvar a conexão.
    }

    salvarConta(workspaceId, {
      instagramBusinessId: token.instagramUserId,
      instagramUsername,
      accessToken: token.accessToken,
      expiraEm: token.expiraEm,
    });

    return NextResponse.redirect(
      new URL(`/admin/workspaces/${workspaceId}?instagram=conectado`, request.url),
    );
  } catch (err) {
    return erroParaResposta(err);
  }
}
