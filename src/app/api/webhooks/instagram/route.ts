import { NextRequest, NextResponse } from "next/server";

// Verificação do webhook (handshake padrão da Meta): ecoa o challenge só se
// o verify_token bater com o configurado no app.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const modo = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (modo === "subscribe" && token === process.env.IG_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verificação falhou.", { status: 403 });
}

// Comentários automáticos e novas DMs chegam por aqui, não por cron
// (handoff, seção 04). A Meta espera um 200 rápido — o processamento pesado
// (análise de nota, resposta do robô) roda a partir daqui, não bloqueia o ack.
export async function POST(request: NextRequest) {
  const corpo = (await request.json()) as { object?: string; entry?: unknown[] };
  console.log(`[webhook instagram] objeto=${corpo.object} entradas=${corpo.entry?.length ?? 0}`);
  return NextResponse.json({ ok: true });
}
