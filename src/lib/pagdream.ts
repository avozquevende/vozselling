import { createHmac, timingSafeEqual } from "node:crypto";

// PagDream é o app de checkout dos planos, próprio, porta 3010. O webhook
// que ele dispara vem assinado por HMAC — nunca processar sem validar.

export interface CheckoutPagDream {
  url: string;
  referencia: string;
}

export async function criarCheckout(workspaceId: number, planoId: number): Promise<CheckoutPagDream> {
  const baseUrl = process.env.PAGDREAM_BASE_URL;
  if (!baseUrl) {
    throw new Error("PAGDREAM_BASE_URL não configurado (ver .env.example).");
  }

  const resposta = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, planoId }),
  });
  if (!resposta.ok) {
    throw new Error(`PagDream recusou o checkout: ${resposta.status}`);
  }
  return (await resposta.json()) as CheckoutPagDream;
}

export function assinaturaValida(corpoRaw: string, assinaturaRecebida: string): boolean {
  const segredo = process.env.PAGDREAM_WEBHOOK_SECRET;
  if (!segredo) {
    throw new Error("PAGDREAM_WEBHOOK_SECRET não configurado (ver .env.example).");
  }

  const esperada = createHmac("sha256", segredo).update(corpoRaw).digest("hex");
  const bufEsperada = Buffer.from(esperada, "hex");
  const bufRecebida = Buffer.from(assinaturaRecebida, "hex");
  if (bufEsperada.length !== bufRecebida.length) return false;
  return timingSafeEqual(bufEsperada, bufRecebida);
}
