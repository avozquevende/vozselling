import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { criarSessao, verificarSenha, ErroApi } from "@/lib/auth";
import { erroParaResposta } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = (await request.json()) as { email?: string; senha?: string };
    if (!email || !senha) {
      throw new ErroApi(400, "Informe email e senha.");
    }

    const db = await getDb();
    const usuario = await db
      .prepare("SELECT id, workspace_id, nome, email, papel, senha_hash FROM usuarios WHERE email = ?")
      .get<{
        id: number;
        workspace_id: number | null;
        nome: string;
        email: string;
        papel: string;
        senha_hash: string;
      }>(email);

    if (!usuario || !verificarSenha(senha, usuario.senha_hash)) {
      throw new ErroApi(401, "Email ou senha inválidos.");
    }

    await criarSessao(usuario.id);

    return NextResponse.json({
      id: usuario.id,
      workspaceId: usuario.workspace_id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
    });
  } catch (err) {
    return erroParaResposta(err);
  }
}
