import { NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { etapasDoWorkspace, moverLeadParaEtapa } from "@/lib/etapas";
import { podeAdicionar, registrarAcao } from "@/lib/daily-limits";
import { erroParaResposta } from "@/lib/api-utils";

/**
 * O ritual de "Ativar" no Ranking (processo do usuário: prospecção → leitura
 * de perfil → análise → é daqui que se faz a adição). "Adição" é uma ação
 * que o Instagram conta contra a conta — por isso passa pelo mesmo teto
 * diário que já existia em daily-limits.ts (podeAdicionar) mas nunca tinha
 * sido ligado a nada. Sem instagram_username não tem perfil pra abrir nem
 * adição real pra fazer — devolve o link pro operador clicar.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await requireApiUser();
    const { id } = await params;
    const leadId = Number(id);
    if (!leadId) throw new ErroApi(400, "id de lead inválido.");

    const db = await getDb();
    const lead = await db
      .prepare("SELECT workspace_id, instagram_username FROM leads WHERE id = ?")
      .get<{ workspace_id: number; instagram_username: string }>(leadId);
    if (!lead) throw new ErroApi(404, "Lead não encontrado.");
    requireWorkspaceAccess(usuario, lead.workspace_id);

    const verificacao = await podeAdicionar(lead.workspace_id);
    if (!verificacao.liberado) {
      throw new ErroApi(
        429,
        `Teto diário de adições atingido (${verificacao.usado}/${verificacao.teto}). Volta amanhã.`,
      );
    }

    const etapas = await etapasDoWorkspace(lead.workspace_id);
    const etapaDestino = etapas.find((e) => e.papel === "prepara");
    if (!etapaDestino) throw new ErroApi(400, "Workspace sem etapa de papel 'prepara' configurada.");

    await moverLeadParaEtapa(leadId, etapaDestino.id);
    await registrarAcao(lead.workspace_id, "adicao");

    return NextResponse.json({
      ok: true,
      perfilUrl: `https://instagram.com/${lead.instagram_username}`,
      usado: verificacao.usado + 1,
      teto: verificacao.teto,
    });
  } catch (err) {
    return erroParaResposta(err);
  }
}
