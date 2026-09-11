import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { contaPorInstagramBusinessId } from "@/lib/instagram-contas";
import { processarMensagemRecebida } from "@/lib/instagram-sync";

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

function assinaturaValida(corpoRaw: string, assinatura: string | null): boolean {
  const segredo = process.env.IG_APP_SECRET;
  if (!segredo) return true; // sem chave configurada ainda (dev local) — não bloqueia
  if (!assinatura) return false;

  const esperada = `sha256=${createHmac("sha256", segredo).update(corpoRaw).digest("hex")}`;
  const bufEsperada = Buffer.from(esperada);
  const bufRecebida = Buffer.from(assinatura);
  if (bufEsperada.length !== bufRecebida.length) return false;
  return timingSafeEqual(bufEsperada, bufRecebida);
}

interface EntradaMessaging {
  sender?: { id?: string };
  message?: { text?: string; is_echo?: boolean };
}

interface EntradaWebhook {
  id?: string; // instagram_business_id da conta que recebeu
  messaging?: EntradaMessaging[];
}

// Comentários automáticos e novas DMs chegam por aqui, não por cron
// (handoff, seção 04). A Meta espera um 200 rápido — por isso qualquer
// payload malformado ou conta não conectada só é logado, nunca derruba o ack.
export async function POST(request: NextRequest) {
  const corpoRaw = await request.text();

  if (!assinaturaValida(corpoRaw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  const corpo = JSON.parse(corpoRaw) as { object?: string; entry?: EntradaWebhook[] };

  for (const entrada of corpo.entry ?? []) {
    if (!entrada.id) continue;
    const conta = contaPorInstagramBusinessId(entrada.id);
    if (!conta) {
      console.log(`[webhook instagram] mensagem para conta não conectada: ${entrada.id}`);
      continue;
    }

    for (const item of entrada.messaging ?? []) {
      const igsid = item.sender?.id;
      const texto = item.message?.text;
      // is_echo = mensagem que a própria conta enviou (pelo robô ou pelo
      // app nativo) refletida de volta pelo webhook — não é resposta do lead.
      if (!igsid || !texto || item.message?.is_echo) continue;

      try {
        await processarMensagemRecebida(conta, igsid, texto);
      } catch (err) {
        console.error(`[webhook instagram] falha ao processar mensagem de ${igsid}:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
