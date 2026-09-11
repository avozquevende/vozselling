import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buscarProntosParaToque } from "@/lib/retomada";
import { processarToqueDeRetomada } from "@/lib/agent-retomada";
import { podeResponderAgora, registrarAcao } from "@/lib/daily-limits";

// dr-cron.sh lotes (handoff, seção 04): processa os toques de retomada que
// venceram, um por lead calado, respeitando o mesmo teto de ritmo humano.
export async function POST(request: NextRequest) {
  if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const workspaces = getDb()
    .prepare("SELECT id FROM workspaces WHERE ativo = 1")
    .all() as Array<{ id: number }>;

  let processados = 0;
  for (const { id: workspaceId } of workspaces) {
    const prontos = buscarProntosParaToque(workspaceId);
    for (const item of prontos) {
      if (!podeResponderAgora(workspaceId).liberado) break;
      await processarToqueDeRetomada(item, workspaceId);
      registrarAcao(workspaceId, "resposta");
      processados++;
    }
  }

  return NextResponse.json({ processados });
}
