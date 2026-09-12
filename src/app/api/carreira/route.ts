import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import {
  nivelAtual,
  descricaoDoNivel,
  proximoNivel,
  calcularMetricasSemana,
  avaliarSinalizacaoPromocao,
  listarHistoricoNivel,
  METAS_SEMANAIS,
} from "@/lib/carreira";
import { erroParaResposta } from "@/lib/api-utils";

// Visão do próprio operador sobre a carreira dele — sem poder de promover
// a si mesmo (isso só existe em /api/admin/usuarios/[id]/carreira).
export async function GET() {
  try {
    const usuario = await requireApiUser();
    const nivel = await nivelAtual(usuario.id);
    const proximo = proximoNivel(nivel);

    const [metricas, sinalizacao, historico] = await Promise.all([
      calcularMetricasSemana(usuario.id),
      avaliarSinalizacaoPromocao(usuario.id),
      listarHistoricoNivel(usuario.id),
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
