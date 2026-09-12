import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireAdmin, hashSenha, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const usuarioId = Number(id);
    const body = (await request.json()) as { resetar?: boolean };
    if (!body.resetar) {
      throw new ErroApi(400, "Nada para atualizar.");
    }

    const db = await getDb();
    const existe = await db.prepare("SELECT id, email FROM usuarios WHERE id = ?").get<{
      id: number;
      email: string;
    }>(usuarioId);
    if (!existe) throw new ErroApi(404, "Acesso não encontrado.");

    const senha = randomBytes(9).toString("base64url");
    await db
      .prepare("UPDATE usuarios SET senha_hash = ?, must_change_password = 1 WHERE id = ?")
      .run(hashSenha(senha), usuarioId);

    // Derruba as sessões abertas com a senha antiga — menos o admin que fez a
    // troca, se por acaso for o mesmo usuário resetando a própria senha.
    await db
      .prepare("DELETE FROM sessoes WHERE usuario_id = ? AND usuario_id != ?")
      .run(usuarioId, admin.id);

    return NextResponse.json({ email: existe.email, senha, provisoria: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const usuarioId = Number(id);
    if (usuarioId === admin.id) {
      throw new ErroApi(400, "Você não pode remover o próprio acesso.");
    }

    const db = await getDb();
    const existe = await db.prepare("SELECT id FROM usuarios WHERE id = ?").get(usuarioId);
    if (!existe) throw new ErroApi(404, "Acesso não encontrado.");

    await db.transaction([
      { sql: "DELETE FROM sessoes WHERE usuario_id = ?", args: [usuarioId] },
      { sql: "DELETE FROM usuarios WHERE id = ?", args: [usuarioId] },
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
