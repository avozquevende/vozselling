import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  nivelAtual,
  descricaoDoNivel,
  proximoNivel,
  calcularMetricasSemana,
  avaliarSinalizacaoPromocao,
  listarHistoricoNivel,
  definirNivel,
  ehNivelValido,
  METAS_SEMANAIS,
} from "@/lib/carreira";
import { erroParaResposta } from "@/lib/api-utils";

async function usuarioExiste(id: number): Promise<boolean> {
  const db = await getDb();
  return !!(await db.prepare("SELECT id FROM usuarios WHERE id = ?").get(id));
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const usuarioId = Number(id);
    if (!(await usuarioExiste(usuarioId))) throw new ErroApi(404, "Usuário não encontrado.");

    const nivel = await nivelAtual(usuarioId);
    const proximo = proximoNivel(nivel);

    const [metricas, sinalizacao, historico] = await Promise.all([
      calcularMetricasSemana(usuarioId),
      avaliarSinalizacaoPromocao(usuarioId),
      listarHistoricoNivel(usuarioId),
    ]);

    return NextResponse.json({
      nivel,
      descricao: descricaoDoNivel(nivel),
      proximoNivel: proximo ? descricaoDoNivel(proximo) : null,
      metricas,
      metas: METAS_SEMANAIS,
      sinalizacao,
      historico,
    });
  } catch (err) {
    return erroParaResposta(err);
  }
}

// Promove ou rebaixa. É sempre uma ação humana — a sinalização automática
// (GET, campo "sinalizacao") só aponta que as métricas bateram a meta.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const usuarioId = Number(id);
    if (!(await usuarioExiste(usuarioId))) throw new ErroApi(404, "Usuário não encontrado.");

    const body = (await request.json()) as { nivel?: string; observacao?: string };
    if (!body.nivel || !ehNivelValido(body.nivel)) {
      throw new ErroApi(400, "nivel precisa ser executor, interprete, gestor ou expert.");
    }

    await definirNivel(usuarioId, body.nivel, body.observacao ?? "", admin.id);
    return NextResponse.json({ ok: true, nivel: body.nivel });
  } catch (err) {
    return erroParaResposta(err);
  }
}
