import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ErroApi } from "@/lib/auth";
import { salvarSecao } from "@/lib/metodologia";
import { erroParaResposta } from "@/lib/api-utils";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ chave: string }> }) {
  try {
    await requireAdmin();
    const { chave } = await params;
    const body = (await request.json()) as { conteudo?: string };
    if (body.conteudo === undefined) throw new ErroApi(400, "conteudo é obrigatório.");

    await salvarSecao(chave, body.conteudo);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
