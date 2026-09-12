import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { processarProximaMensagem } from "@/lib/agent-piloto";
import type { LeadNaFila } from "@/lib/piloto";
import { erroParaResposta } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const body = (await request.json()) as { leadId?: number };
    if (!body.leadId) throw new ErroApi(400, "leadId é obrigatório.");

    const db = await getDb();
    const lead = await db
      .prepare(
        `SELECT id, workspace_id, etapa_id, instagram_username, instagram_scoped_id, nome,
                mensagens_robo_count, janela_24h_expira_em
         FROM leads WHERE id = ?`,
      )
      .get<LeadNaFila>(body.leadId);

    if (!lead) throw new ErroApi(404, "Lead não encontrado.");
    requireWorkspaceAccess(usuario, lead.workspace_id);

    const resultado = await processarProximaMensagem(lead);
    return NextResponse.json(resultado);
  } catch (err) {
    return erroParaResposta(err);
  }
}
