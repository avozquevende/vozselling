import { getDb } from "./db";
import { classificarNota } from "./agent-a1";

// Comentários automáticos (spec, seção 06). Comentar num post do próprio
// cliente é atendimento, não prospecção — não passa pelos freios de
// daily-limits.ts, e por padrão o lead filtrado entra no Ranking (o
// operador decide ativar, o robô não aborda sozinho a partir daqui).

export type AcaoComentario = "so_avaliar" | "responder_post" | "responder_e_chamar";

export function decidirAcaoComentario(nota: number, concorrente: boolean): AcaoComentario {
  const classificacao = classificarNota(nota, { concorrente });
  if (classificacao.faixa === "perfeito" || classificacao.faixa === "forte") {
    return "responder_e_chamar";
  }
  if (classificacao.faixa === "parcial") {
    return "responder_post";
  }
  return "so_avaliar";
}

export interface RegistrarComentarioInput {
  workspaceId: number;
  postId: string;
  autorInstagram: string;
  texto: string;
  nota: number;
  acao: AcaoComentario;
}

export async function registrarComentario(input: RegistrarComentarioInput): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO comentarios (workspace_id, post_id, autor_instagram, texto, nota, acao)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.workspaceId, input.postId, input.autorInstagram, input.texto, input.nota, input.acao);
}
