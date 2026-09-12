import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { etapaPorId, moverLeadParaEtapa } from "@/lib/etapas";
import { entrarNaFilaDeRetomada, ESCADAS, zerarRetomada, type Escada } from "@/lib/retomada";
import { getDb } from "@/lib/db";
import { erroParaResposta } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const body = (await request.json()) as { leadId?: number; etapaId?: number; escadaRetomada?: string };
    if (!body.leadId || !body.etapaId) {
      throw new ErroApi(400, "leadId e etapaId são obrigatórios.");
    }
    if (body.escadaRetomada && !(body.escadaRetomada in ESCADAS)) {
      throw new ErroApi(400, "escadaRetomada inválida.");
    }

    const etapaDestino = await etapaPorId(body.etapaId);
    if (!etapaDestino) throw new ErroApi(404, "Etapa não encontrada.");
    requireWorkspaceAccess(usuario, etapaDestino.workspace_id);

    const db = await getDb();
    const lead = await db
      .prepare("SELECT workspace_id FROM leads WHERE id = ?")
      .get<{ workspace_id: number }>(body.leadId);
    if (!lead) throw new ErroApi(404, "Lead não encontrado.");
    if (lead.workspace_id !== etapaDestino.workspace_id) {
      throw new ErroApi(400, "Etapa não pertence ao mesmo workspace do lead.");
    }

    await moverLeadParaEtapa(body.leadId, body.etapaId);
    if (body.escadaRetomada) {
      // Operador sabe o motivo de cor (spec: "derivado da etapa, ou marcado
      // à mão") — entra direto na escada certa em vez de esperar o cron
      // detectar a janela fechada.
      await entrarNaFilaDeRetomada(body.leadId, body.escadaRetomada as Escada);
    } else {
      // Lead avançou sem motivo explícito: cada degrau do funil ganha
      // fôlego novo, a retomada anterior não se aplica mais.
      await zerarRetomada(body.leadId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
