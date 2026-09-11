import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hashSenha, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const workspaceId = Number(id);

    const usuarios = getDb()
      .prepare("SELECT id, nome, email, papel, criado_em FROM usuarios WHERE workspace_id = ?")
      .all(workspaceId);
    return NextResponse.json({ usuarios });
  } catch (err) {
    return erroParaResposta(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const workspaceId = Number(id);

    const body = (await request.json()) as { nome?: string; email?: string; senha?: string };
    if (!body.nome || !body.email || !body.senha) {
      throw new ErroApi(400, "nome, email e senha são obrigatórios.");
    }

    const workspace = getDb().prepare("SELECT id FROM workspaces WHERE id = ?").get(workspaceId);
    if (!workspace) throw new ErroApi(404, "Workspace não encontrado.");

    const senhaHash = hashSenha(body.senha);
    try {
      const resultado = getDb()
        .prepare(
          "INSERT INTO usuarios (workspace_id, nome, email, senha_hash, papel) VALUES (?, ?, ?, ?, 'operador')",
        )
        .run(workspaceId, body.nome, body.email, senhaHash);
      return NextResponse.json({ id: resultado.lastInsertRowid }, { status: 201 });
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err);
      if (mensagem.includes("UNIQUE constraint failed")) {
        throw new ErroApi(409, "Já existe um usuário com este email.");
      }
      throw err;
    }
  } catch (err) {
    return erroParaResposta(err);
  }
}
