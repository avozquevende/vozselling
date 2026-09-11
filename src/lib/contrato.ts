import { getDb } from "./db";

// Pagar → criar conta → creditar é automático (handoff, seção 10). Este
// arquivo é o passo final: um pagamento confirmado (Mercado Pago ou
// PagDream, ambos já rebuscados na fonte) vira contrato ativo + crédito.

export function ativarContrato(
  workspaceId: number,
  planoId: number,
  referenciaPagamento: string,
): void {
  const db = getDb();
  const transacao = db.transaction(() => {
    db.prepare(
      `INSERT INTO contratos (workspace_id, plano_id, status, referencia_pagamento)
       VALUES (?, ?, 'ativo', ?)`,
    ).run(workspaceId, planoId, referenciaPagamento);

    db.prepare(
      `INSERT INTO creditos (workspace_id, saldo, atualizado_em)
       VALUES (?, 0, datetime('now','localtime'))
       ON CONFLICT(workspace_id) DO NOTHING`,
    ).run(workspaceId);
  });
  transacao();
}

export function creditarWorkspace(workspaceId: number, quantidade: number): void {
  getDb()
    .prepare(
      `UPDATE creditos SET saldo = saldo + ?, atualizado_em = datetime('now','localtime')
       WHERE workspace_id = ?`,
    )
    .run(quantidade, workspaceId);
}
