import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { processarToqueDeRetomada } from "@/lib/agent-retomada";
import { erroParaResposta } from "@/lib/api-utils";
import type { Escada, ItemRetomada } from "@/lib/retomada";

export async function POST(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const body = (await request.json()) as { itemId?: number };
    if (!body.itemId) throw new ErroApi(400, "itemId é obrigatório.");

    const item = getDb()
      .prepare(
        `SELECT r.id, r.lead_id, r.escada, r.passo, r.proximo_toque_em, l.workspace_id
         FROM retomada_fila r
         JOIN leads l ON l.id = r.lead_id
         WHERE r.id = ? AND r.ativo = 1`,
      )
      .get(body.itemId) as (ItemRetomada & { escada: Escada; workspace_id: number }) | undefined;

    if (!item) throw new ErroApi(404, "Item de retomada não encontrado ou já inativo.");
    requireWorkspaceAccess(usuario, item.workspace_id);

    const resultado = await processarToqueDeRetomada(item, item.workspace_id);
    return NextResponse.json(resultado);
  } catch (err) {
    return erroParaResposta(err);
  }
}
