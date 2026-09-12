import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireAdmin, hashSenha, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();
    const usuarios = await db
      .prepare(
        `SELECT u.id, u.email, u.nome, u.papel, u.workspace_id, u.must_change_password, u.criado_em,
                w.nome AS workspace_nome,
                (SELECT COUNT(*) FROM sessoes s WHERE s.usuario_id = u.id) AS sessoes
           FROM usuarios u
           LEFT JOIN workspaces w ON w.id = u.workspace_id
          ORDER BY u.papel, u.email`,
      )
      .all();
    return NextResponse.json({ usuarios });
  } catch (err) {
    return erroParaResposta(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      email?: string;
      nome?: string;
      papel?: "admin" | "operador";
      workspace_id?: number;
      senha?: string;
    };
    if (!body.email || !body.nome || !body.papel) {
      throw new ErroApi(400, "email, nome e papel são obrigatórios.");
    }
    if (body.papel !== "admin" && body.papel !== "operador") {
      throw new ErroApi(400, "papel deve ser admin ou operador.");
    }
    if (body.papel === "operador" && !body.workspace_id) {
      throw new ErroApi(400, "operador precisa de um workspace.");
    }

    const senha = body.senha?.trim() || randomBytes(9).toString("base64url");
    const provisoria = !body.senha?.trim();
    const senhaHash = hashSenha(senha);

    const db = await getDb();
    try {
      const resultado = await db
        .prepare(
          `INSERT INTO usuarios (workspace_id, nome, email, senha_hash, papel, must_change_password)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          body.papel === "operador" ? body.workspace_id : null,
          body.nome,
          body.email,
          senhaHash,
          body.papel,
          provisoria ? 1 : 0,
        );
      return NextResponse.json(
        { id: resultado.lastInsertRowid, email: body.email, senha, provisoria },
        { status: 201 },
      );
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err);
      if (mensagem.includes("UNIQUE constraint failed")) {
        throw new ErroApi(409, "Já existe um acesso com este email.");
      }
      throw err;
    }
  } catch (err) {
    return erroParaResposta(err);
  }
}
