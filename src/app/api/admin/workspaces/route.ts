import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { garantirEtapasPadrao } from "@/lib/etapas";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();
    const workspaces = await db
      .prepare("SELECT id, nome, slug, ativo, criado_em FROM workspaces ORDER BY criado_em DESC")
      .all();
    return NextResponse.json({ workspaces });
  } catch (err) {
    return erroParaResposta(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { nome?: string; slug?: string };
    if (!body.nome || !body.slug) throw new ErroApi(400, "nome e slug são obrigatórios.");

    const db = await getDb();
    const resultado = await db.prepare("INSERT INTO workspaces (nome, slug) VALUES (?, ?)").run(body.nome, body.slug);

    const workspaceId = Number(resultado.lastInsertRowid);
    await garantirEtapasPadrao(workspaceId);

    return NextResponse.json({ id: workspaceId }, { status: 201 });
  } catch (err) {
    return erroParaResposta(err);
  }
}
