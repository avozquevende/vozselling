import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, hashSenha, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const { senha } = (await request.json()) as { senha?: string };
    if (!senha || senha.length < 8) {
      throw new ErroApi(400, "A senha precisa ter pelo menos 8 caracteres.");
    }

    const db = await getDb();
    await db
      .prepare("UPDATE usuarios SET senha_hash = ?, must_change_password = 0 WHERE id = ?")
      .run(hashSenha(senha), usuario.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
