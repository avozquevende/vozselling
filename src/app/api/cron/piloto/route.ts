import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buscarFilaDoPiloto } from "@/lib/piloto";
import { processarProximaMensagem } from "@/lib/agent-piloto";
import { podeResponderAgora, registrarAcao } from "@/lib/daily-limits";

// Roda a cada minuto (piloto-cron.sh no crontab do servidor, handoff seção 04).
// Respeita o teto de 40 respostas/hora mesmo entre workspaces diferentes
// dentro da mesma chamada — para na hora que estourar, não força a fila.
export async function POST(request: NextRequest) {
  if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const workspaces = getDb()
    .prepare("SELECT id FROM workspaces WHERE ativo = 1")
    .all() as Array<{ id: number }>;

  let processados = 0;
  for (const { id: workspaceId } of workspaces) {
    const fila = buscarFilaDoPiloto(workspaceId);
    for (const lead of fila) {
      if (!podeResponderAgora(workspaceId).liberado) break;
      const resultado = await processarProximaMensagem(lead);
      if (resultado.status === "mensagem_gerada") {
        registrarAcao(workspaceId, "resposta");
        processados++;
      }
    }
  }

  return NextResponse.json({ processados });
}
