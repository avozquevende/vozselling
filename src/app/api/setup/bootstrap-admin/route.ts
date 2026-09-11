import { NextRequest, NextResponse } from "next/server";
import { hashSenha, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

// Cria (ou atualiza) um acesso admin por HTTP — equivalente remoto do
// scripts/criar-acesso.mjs, que só funciona com acesso ao filesystem local.
// Necessário em qualquer deploy sem SSH (Vercel, por exemplo). Protegido
// pelo mesmo CRON_SECRET que já é obrigatório para os crons.
export async function POST(request: NextRequest) {
  try {
    const segredoConfigurado = process.env.CRON_SECRET;
    if (!segredoConfigurado) {
      throw new ErroApi(500, "CRON_SECRET não configurado no servidor.");
    }

    const body = (await request.json()) as {
      secret?: string;
      email?: string;
      senha?: string;
      nome?: string;
    };
    if (body.secret !== segredoConfigurado) {
      throw new ErroApi(401, "Segredo inválido.");
    }
    if (!body.email || !body.senha || !body.nome) {
      throw new ErroApi(400, "email, senha e nome são obrigatórios.");
    }

    const senhaHash = hashSenha(body.senha);
    getDb()
      .prepare(
        `INSERT INTO usuarios (workspace_id, nome, email, senha_hash, papel)
         VALUES (NULL, ?, ?, ?, 'admin')
         ON CONFLICT(email) DO UPDATE SET
           nome = excluded.nome, senha_hash = excluded.senha_hash, papel = 'admin'`,
      )
      .run(body.nome, body.email, senhaHash);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
