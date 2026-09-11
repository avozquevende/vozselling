import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { limitesDoWorkspace, definirLimitesDoWorkspace } from "@/lib/daily-limits";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const workspaceId = Number(id);

    const workspace = getDb()
      .prepare("SELECT id, nome, slug, ativo, icp, ofertas, criado_em FROM workspaces WHERE id = ?")
      .get(workspaceId) as
      | { id: number; nome: string; slug: string; ativo: number; icp: string; ofertas: string; criado_em: string }
      | undefined;
    if (!workspace) throw new ErroApi(404, "Workspace não encontrado.");

    return NextResponse.json({ workspace, limites: limitesDoWorkspace(workspaceId) });
  } catch (err) {
    return erroParaResposta(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const workspaceId = Number(id);

    const body = (await request.json()) as {
      icp?: string;
      ofertas?: string;
      tetoAdicoesDia?: number;
      tetoFollowsDia?: number;
    };

    const db = getDb();
    if (body.icp !== undefined || body.ofertas !== undefined) {
      const atual = db.prepare("SELECT icp, ofertas FROM workspaces WHERE id = ?").get(workspaceId) as
        | { icp: string; ofertas: string }
        | undefined;
      if (!atual) throw new ErroApi(404, "Workspace não encontrado.");
      db.prepare("UPDATE workspaces SET icp = ?, ofertas = ? WHERE id = ?").run(
        body.icp ?? atual.icp,
        body.ofertas ?? atual.ofertas,
        workspaceId,
      );
    }

    if (body.tetoAdicoesDia !== undefined || body.tetoFollowsDia !== undefined) {
      const atuais = limitesDoWorkspace(workspaceId);
      definirLimitesDoWorkspace(workspaceId, {
        tetoAdicoesDia: body.tetoAdicoesDia ?? atuais.teto_adicoes_dia,
        tetoFollowsDia: body.tetoFollowsDia ?? atuais.teto_follows_dia,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
