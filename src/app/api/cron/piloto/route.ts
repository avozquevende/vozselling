import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buscarFilaDoPiloto } from "@/lib/piloto";
import { processarProximaMensagem } from "@/lib/agent-piloto";
import { podeResponderAgora, registrarAcao } from "@/lib/daily-limits";
import { verificarSegredoCron } from "@/lib/auth";

// Roda a cada minuto (piloto-cron.sh no crontab do servidor, handoff seção 04).
// Respeita o teto de 40 respostas/hora mesmo entre workspaces diferentes
// dentro da mesma chamada — para na hora que estourar, não força a fila.
export async function POST(request: NextRequest) {
  if (!verificarSegredoCron(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const db = await getDb();
  const workspaces = await db.prepare("SELECT id FROM workspaces WHERE ativo = 1").all<{ id: number }>();

  let processados = 0;
  for (const { id: workspaceId } of workspaces) {
    const fila = await buscarFilaDoPiloto(workspaceId);
    for (const lead of fila) {
      const verificacao = await podeResponderAgora(workspaceId);
      if (!verificacao.liberado) break;
      const resultado = await processarProximaMensagem(lead);
      if (resultado.status === "mensagem_gerada") {
        await registrarAcao(workspaceId, "resposta");
        processados++;
      }
    }
  }

  return NextResponse.json({ processados });
}
