import { NextRequest, NextResponse } from "next/server";
import { buscarPagamento } from "@/lib/mercadopago";
import { ativarContrato } from "@/lib/contrato";

// O corpo da notificação não é confiável — só diz "um pagamento mudou". A
// verdade vem de rebuscar o pagamento direto na API do Mercado Pago.
export async function POST(request: NextRequest) {
  const corpo = (await request.json()) as { type?: string; data?: { id?: string } };

  if (corpo.type !== "payment" || !corpo.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const pagamento = await buscarPagamento(corpo.data.id);
  if (pagamento.status === "approved" && pagamento.externalReference) {
    const [workspaceId, planoId] = pagamento.externalReference.split(":").map(Number);
    if (workspaceId && planoId) {
      ativarContrato(workspaceId, planoId, pagamento.id);
    }
  }

  return NextResponse.json({ ok: true });
}
