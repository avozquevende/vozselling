import { getDb } from "./db";
import { roboPodeFalar } from "./papeis";
import { etapaPorId } from "./etapas";

// A régua do relógio (spec, seção 02): o que o robô diz depende de em que
// ponto da conversa está — contado nas mensagens que ELE escreveu, nunca no
// total da conversa. Uma conversa com 15 mensagens antigas do operador não
// põe o robô já no convite: enquanto ele tiver escrito menos de 3, está em
// conexão, doa o que doer no total.
export type ModoConversa =
  | "conexao"
  | "conducao"
  | "convite"
  | "agendamento"
  | "excedeu_regua";

export function modoDaProximaMensagem(mensagensRoboEnviadas: number): ModoConversa {
  const numeroDaProxima = mensagensRoboEnviadas + 1;
  if (numeroDaProxima <= 3) return "conexao";
  if (numeroDaProxima <= 9) return "conducao";
  if (numeroDaProxima === 10) return "convite";
  if (numeroDaProxima <= 15) return "agendamento";
  return "excedeu_regua"; // convida direto, ou devolve ao operador
}

/** Conexão não se pula: convite antes da 4ª mensagem do robô é pitch. */
export function podeConvidar(mensagensRoboEnviadas: number): boolean {
  return mensagensRoboEnviadas >= 3;
}

export interface LeadNaFila {
  id: number;
  workspace_id: number;
  etapa_id: number;
  instagram_username: string;
  instagram_scoped_id: string | null;
  nome: string | null;
  mensagens_robo_count: number;
  janela_24h_expira_em: string | null;
}

/**
 * Fila do piloto: leads numa etapa que declara papel "conduz", dentro da
 * janela de 24h da Meta, e onde quem falou por último foi o lead — é a vez
 * do robô responder.
 */
export function buscarFilaDoPiloto(workspaceId: number): LeadNaFila[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT l.id, l.workspace_id, l.etapa_id, l.instagram_username, l.instagram_scoped_id, l.nome,
              l.mensagens_robo_count, l.janela_24h_expira_em
       FROM leads l
       JOIN etapas e ON e.id = l.etapa_id
       WHERE l.workspace_id = ?
         AND e.papel = 'conduz'
         AND l.ultimo_falante = 'lead'
         AND (l.janela_24h_expira_em IS NULL OR l.janela_24h_expira_em > datetime('now','localtime'))
       ORDER BY l.atualizado_em ASC`,
    )
    .all(workspaceId);
  return rows as LeadNaFila[];
}

export function leadEstaNaJanela24h(lead: LeadNaFila): boolean {
  if (!lead.janela_24h_expira_em) return false;
  const db = getDb();
  const row = db
    .prepare(
      "SELECT (?) > datetime('now','localtime') AS dentro",
    )
    .get(lead.janela_24h_expira_em) as { dentro: number };
  return row.dentro === 1;
}

/** Confere que a etapa atual do lead realmente autoriza o robô a falar. */
export function roboAutorizadoNaEtapa(etapaId: number): boolean {
  const etapa = etapaPorId(etapaId);
  if (!etapa) return false;
  return roboPodeFalar(etapa.papel);
}
