import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAdmin();
    const planos = getDb().prepare("SELECT id, nome, preco_centavos, modulos FROM planos").all();
    return NextResponse.json({ planos });
  } catch (err) {
    return erroParaResposta(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      nome?: string;
      precoCentavos?: number;
      modulos?: string[];
    };
    if (!body.nome || !body.precoCentavos) {
      throw new ErroApi(400, "nome e precoCentavos são obrigatórios.");
    }

    const resultado = getDb()
      .prepare("INSERT INTO planos (nome, preco_centavos, modulos) VALUES (?, ?, ?)")
      .run(body.nome, body.precoCentavos, JSON.stringify(body.modulos ?? []));

    return NextResponse.json({ id: resultado.lastInsertRowid }, { status: 201 });
  } catch (err) {
    return erroParaResposta(err);
  }
}
