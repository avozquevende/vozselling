import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buscarProntosParaToque, varrerLeadsFriosParaRetomada } from "@/lib/retomada";
import { processarToqueDeRetomada } from "@/lib/agent-retomada";
import { podeResponderAgora, registrarAcao } from "@/lib/daily-limits";
import { verificarSegredoCron } from "@/lib/auth";

// dr-cron.sh lotes (handoff, seção 04): processa os toques de retomada que
// venceram, um por lead calado, respeitando o mesmo teto de ritmo humano.
export async function POST(request: NextRequest) {
  if (!verificarSegredoCron(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const db = await getDb();
  const workspaces = await db.prepare("SELECT id FROM workspaces WHERE ativo = 1").all<{ id: number }>();

  let processados = 0;
  let entraramNaFila = 0;
  for (const { id: workspaceId } of workspaces) {
    // Antes de tocar quem já está na régua, detecta quem esfriou agora e
    // ainda não entrou (ver retomada.ts) — sem isso ninguém nunca começava.
    entraramNaFila += await varrerLeadsFriosParaRetomada(workspaceId);

    const prontos = await buscarProntosParaToque(workspaceId);
    for (const item of prontos) {
      const verificacao = await podeResponderAgora(workspaceId);
      if (!verificacao.liberado) break;
      await processarToqueDeRetomada(item, workspaceId);
      await registrarAcao(workspaceId, "resposta");
      processados++;
    }
  }

  return NextResponse.json({ processados, entraramNaFila });
}
