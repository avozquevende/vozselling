// O webhook do Mercado Pago não confia no corpo da notificação — ele só diz
// "algo mudou", então sempre se rebusca o pagamento direto na API antes de
// creditar qualquer coisa (spec/handoff, seção 08).

export interface PagamentoMercadoPago {
  id: string;
  status: "approved" | "pending" | "rejected" | "cancelled" | string;
  externalReference: string | null;
}

export async function buscarPagamento(paymentId: string): Promise<PagamentoMercadoPago> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado (ver .env.example).");
  }

  const resposta = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao buscar pagamento ${paymentId}: ${resposta.status}`);
  }
  const json = (await resposta.json()) as {
    id: number;
    status: string;
    external_reference: string | null;
  };

  return {
    id: String(json.id),
    status: json.status,
    externalReference: json.external_reference,
  };
}
