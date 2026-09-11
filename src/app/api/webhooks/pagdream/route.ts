import { NextRequest, NextResponse } from "next/server";
import { assinaturaValida } from "@/lib/pagdream";
import { ativarContrato } from "@/lib/contrato";

export async function POST(request: NextRequest) {
  const corpoRaw = await request.text();
  const assinatura = request.headers.get("x-pagdream-signature");

  if (!assinatura || !assinaturaValida(corpoRaw, assinatura)) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  const evento = JSON.parse(corpoRaw) as {
    workspaceId?: number;
    planoId?: number;
    referencia?: string;
  };
  if (evento.workspaceId && evento.planoId && evento.referencia) {
    ativarContrato(evento.workspaceId, evento.planoId, evento.referencia);
  }

  return NextResponse.json({ ok: true });
}
