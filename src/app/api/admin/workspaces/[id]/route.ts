import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { limitesDoWorkspace, definirLimitesDoWorkspace } from "@/lib/daily-limits";
import { contaPorWorkspace } from "@/lib/instagram-contas";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const workspaceId = Number(id);

    const db = await getDb();
    const workspace = await db
      .prepare(
        "SELECT id, nome, slug, ativo, icp, ofertas, automacao_pausada, criado_em FROM workspaces WHERE id = ?",
      )
      .get<{
        id: number;
        nome: string;
        slug: string;
        ativo: number;
        icp: string;
        ofertas: string;
        automacao_pausada: number;
        criado_em: string;
      }>(workspaceId);
    if (!workspace) throw new ErroApi(404, "Workspace não encontrado.");

    const [conta, limites] = await Promise.all([
      contaPorWorkspace(workspaceId),
      limitesDoWorkspace(workspaceId),
    ]);
    return NextResponse.json({
      workspace,
      limites,
      instagram: conta
        ? { conectado: true, username: conta.instagram_username, expiraEm: conta.token_expira_em }
        : { conectado: false },
    });
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
      automacaoPausada?: boolean;
    };

    const db = await getDb();
    if (body.icp !== undefined || body.ofertas !== undefined) {
      const atual = await db
        .prepare("SELECT icp, ofertas FROM workspaces WHERE id = ?")
        .get<{ icp: string; ofertas: string }>(workspaceId);
      if (!atual) throw new ErroApi(404, "Workspace não encontrado.");
      await db
        .prepare("UPDATE workspaces SET icp = ?, ofertas = ? WHERE id = ?")
        .run(body.icp ?? atual.icp, body.ofertas ?? atual.ofertas, workspaceId);
    }

    if (body.tetoAdicoesDia !== undefined || body.tetoFollowsDia !== undefined) {
      const atuais = await limitesDoWorkspace(workspaceId);
      await definirLimitesDoWorkspace(workspaceId, {
        tetoAdicoesDia: body.tetoAdicoesDia ?? atuais.teto_adicoes_dia,
        tetoFollowsDia: body.tetoFollowsDia ?? atuais.teto_follows_dia,
      });
    }

    // "Parar tudo": pausa piloto e retomada deste workspace inteiro, sem
    // precisar desconectar a conta do Instagram.
    if (body.automacaoPausada !== undefined) {
      await db
        .prepare("UPDATE workspaces SET automacao_pausada = ? WHERE id = ?")
        .run(body.automacaoPausada ? 1 : 0, workspaceId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
