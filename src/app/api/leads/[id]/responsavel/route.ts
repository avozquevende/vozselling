import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

// Atribuir um lead a um operador é o que liga leads.responsavel_id — sem
// isso o lead não conta nas métricas de carreira de ninguém (carreira.ts).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await requireApiUser();
    const { id } = await params;
    const leadId = Number(id);

    const body = (await request.json()) as { responsavelId?: number | null };

    const db = await getDb();
    const lead = await db
      .prepare("SELECT workspace_id FROM leads WHERE id = ?")
      .get<{ workspace_id: number }>(leadId);
    if (!lead) throw new ErroApi(404, "Lead não encontrado.");
    requireWorkspaceAccess(usuario, lead.workspace_id);

    if (body.responsavelId != null) {
      const responsavel = await db
        .prepare("SELECT workspace_id FROM usuarios WHERE id = ?")
        .get<{ workspace_id: number | null }>(body.responsavelId);
      if (!responsavel) throw new ErroApi(404, "Responsável não encontrado.");
      if (responsavel.workspace_id !== lead.workspace_id) {
        throw new ErroApi(400, "Responsável precisa ser do mesmo workspace do lead.");
      }
    }

    await db
      .prepare("UPDATE leads SET responsavel_id = ?, atualizado_em = datetime('now','localtime') WHERE id = ?")
      .run(body.responsavelId ?? null, leadId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
