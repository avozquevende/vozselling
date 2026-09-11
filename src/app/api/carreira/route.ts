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
    const nivel = nivelAtual(usuario.id);
    const proximo = proximoNivel(nivel);

    return NextResponse.json({
      nivel,
      descricao: descricaoDoNivel(nivel),
      proximoNivel: proximo ? descricaoDoNivel(proximo) : null,
      metricas: calcularMetricasSemana(usuario.id),
      metas: METAS_SEMANAIS,
      sinalizacao: avaliarSinalizacaoPromocao(usuario.id),
      historico: listarHistoricoNivel(usuario.id),
    });
  } catch (err) {
    return erroParaResposta(err);
  }
}
