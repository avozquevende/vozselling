import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireWorkspaceAccess, ErroApi } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { analisarLead } from "@/lib/agent-a1";
import { decidirAcaoComentario, registrarComentario } from "@/lib/comentarios";
import { erroParaResposta } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const usuario = await requireApiUser();
    const body = (await request.json()) as {
      workspaceId?: number;
      postId?: string;
      autorInstagram?: string;
      texto?: string;
    };
    if (!body.workspaceId || !body.postId || !body.autorInstagram || !body.texto) {
      throw new ErroApi(400, "workspaceId, postId, autorInstagram e texto são obrigatórios.");
    }
    requireWorkspaceAccess(usuario, body.workspaceId);

    const workspace = getDb()
      .prepare("SELECT icp, ofertas FROM workspaces WHERE id = ?")
      .get(body.workspaceId) as { icp: string; ofertas: string } | undefined;
    if (!workspace) throw new ErroApi(404, "Workspace não encontrado.");

    const analise = await analisarLead({
      icp: workspace.icp,
      ofertas: workspace.ofertas,
      mensagemDireta: body.texto,
    });
    const acao = decidirAcaoComentario(analise.nota, analise.concorrente);

    registrarComentario({
      workspaceId: body.workspaceId,
      postId: body.postId,
      autorInstagram: body.autorInstagram,
      texto: body.texto,
      nota: analise.nota,
      acao,
    });

    return NextResponse.json({ nota: analise.nota, motivo: analise.motivo, acao });
  } catch (err) {
    return erroParaResposta(err);
  }
}
