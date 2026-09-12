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
 * janela de 24h da Meta, onde quem falou por último foi o lead, a automação
 * do workspace não está pausada ("parar tudo"), o piloto não foi desligado
 * pra este lead específico (trava de raiva, ver travas-conversa.ts), e o
 * atraso anti-bloqueio já passou — resposta instantânea é o padrão nº1 que a
 * Meta reconhece como bot (ver instagram-sync.ts).
 */
export async function buscarFilaDoPiloto(workspaceId: number): Promise<LeadNaFila[]> {
  const db = await getDb();
  return db
    .prepare(
      `SELECT l.id, l.workspace_id, l.etapa_id, l.instagram_username, l.instagram_scoped_id, l.nome,
              l.mensagens_robo_count, l.janela_24h_expira_em
       FROM leads l
       JOIN etapas e ON e.id = l.etapa_id
       JOIN workspaces w ON w.id = l.workspace_id
       WHERE l.workspace_id = ?
         AND e.papel = 'conduz'
         AND l.ultimo_falante = 'lead'
         AND COALESCE(l.piloto_desativado, 0) = 0
         AND COALESCE(w.automacao_pausada, 0) = 0
         AND (l.janela_24h_expira_em IS NULL OR l.janela_24h_expira_em > datetime('now','localtime'))
         AND (l.proximo_toque_liberado_em IS NULL OR l.proximo_toque_liberado_em <= datetime('now','localtime'))
       ORDER BY l.atualizado_em ASC`,
    )
    .all<LeadNaFila>(workspaceId);
}

export async function leadEstaNaJanela24h(lead: LeadNaFila): Promise<boolean> {
  if (!lead.janela_24h_expira_em) return false;
  const db = await getDb();
  const row = await db
    .prepare("SELECT (?) > datetime('now','localtime') AS dentro")
    .get<{ dentro: number }>(lead.janela_24h_expira_em);
  return row?.dentro === 1;
}

/**
 * Faltando menos de 6h para a janela de 24h da Meta fechar, o robô é
 * avisado e convida em vez de sondar (spec: 75 mensagens até um
 * agendamento dependem de o lead escrever de novo sem sumir um dia —
 * cada troca a mais é uma chance de perder a conversa).
 */
export async function janelaProximaDeExpirar(lead: LeadNaFila): Promise<boolean> {
  if (!lead.janela_24h_expira_em) return false;
  const db = await getDb();
  const row = await db
    .prepare(
      "SELECT (julianday(?) - julianday(datetime('now','localtime'))) * 24 AS horas",
    )
    .get<{ horas: number | null }>(lead.janela_24h_expira_em);
  if (row?.horas == null) return false;
  return row.horas > 0 && row.horas < 6;
}

/** Confere que a etapa atual do lead realmente autoriza o robô a falar. */
export async function roboAutorizadoNaEtapa(etapaId: number): Promise<boolean> {
  const etapa = await etapaPorId(etapaId);
  if (!etapa) return false;
  return roboPodeFalar(etapa.papel);
}
