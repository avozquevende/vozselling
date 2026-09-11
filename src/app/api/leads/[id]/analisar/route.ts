import { NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { analisarEQualificarLead } from "@/lib/agent-a1";
import { erroParaResposta } from "@/lib/api-utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await requireApiUser();
    const { id } = await params;
    const leadId = Number(id);
    if (!leadId) throw new ErroApi(400, "id de lead inválido.");

    const lead = getDb()
      .prepare("SELECT workspace_id FROM leads WHERE id = ?")
      .get(leadId) as { workspace_id: number } | undefined;
    if (!lead) throw new ErroApi(404, "Lead não encontrado.");
    requireWorkspaceAccess(usuario, lead.workspace_id);

    const resultado = await analisarEQualificarLead(leadId);
    return NextResponse.json(resultado);
  } catch (err) {
    return erroParaResposta(err);
  }
}
