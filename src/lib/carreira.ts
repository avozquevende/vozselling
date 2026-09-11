import { getDb } from "./db";

// Escada de carreira do Social Seller — manual "Método VOZ SELLING™"
// (Filippe Neto, Ana Ferraz, Pablo Marçal), capítulo 9. É sobre posição de
// valor dentro da operação, não sobre tirar ninguém do campo: cada degrau é
// uma entrega mais estratégica, não uma saída da conversa com o lead.
//
// As métricas aqui são calculadas a partir de leads.responsavel_id — o lead
// precisa estar atribuído a um operador (ver /api/leads/[id]/responsavel)
// para contar nas métricas dele. Sem atribuição, as métricas ficam zeradas;
// isso é intencional, para nunca misturar o trabalho de duas pessoas no
// mesmo workspace.
//
// A promoção NUNCA é automática. calcularMetricasSemana + avaliarSinalizacaoPromocao
// só sinalizam quando as métricas batem a meta do método — quem decide e
// confirma é sempre um admin, via definirNivel, e fica registrado em
// nivel_eventos.

export type NivelCarreira = "executor" | "interprete" | "gestor" | "expert";

export const NIVEIS: readonly NivelCarreira[] = ["executor", "interprete", "gestor", "expert"] as const;

export function ehNivelValido(valor: string): valor is NivelCarreira {
  return (NIVEIS as readonly string[]).includes(valor);
}

export interface DescricaoNivel {
  nivel: NivelCarreira;
  titulo: string;
  descricao: string;
  proximoPasso: string;
}

const DESCRICOES: Record<NivelCarreira, DescricaoNivel> = {
  executor: {
    nivel: "executor",
    titulo: "Executor de Conversas Estratégicas",
    descricao:
      "Aplica o método VOZ SELLING™ com disciplina e respeito: faz abordagens, conduz com empatia e sabe aplicar os scripts com leveza. Garante que nenhuma oportunidade passe despercebida.",
    proximoPasso: "Dominar a planilha/CRM, identificar leads que somem e começar a enxergar padrões de resposta.",
  },
  interprete: {
    nivel: "interprete",
    titulo: "Intérprete do Lead",
    descricao:
      "Observa o comportamento do público e traduz onde as conversas travam, sugerindo ajustes de conteúdo, script e CTA com base no que ouve — nunca no achismo.",
    proximoPasso: "Criar um relatório semanal com sugestões e testar uma nova abordagem, medindo o resultado.",
  },
  gestor: {
    nivel: "gestor",
    titulo: "Gestor da Conversão",
    descricao:
      "Domina o ciclo completo, entende o produto como se fosse seu e propõe melhorias no funil. Pensa como operação, não só como conversa — pode treinar alguém e liderar processos.",
    proximoPasso: "Apresentar ideias de copy com base nos insights dos leads e ajudar a preparar o funil para lançamentos ou campanhas.",
  },
  expert: {
    nivel: "expert",
    titulo: "Expert em Relacionamento e Conversão",
    descricao:
      "Participa de decisões, lidera ajustes de posicionamento e co-cria estratégias com o expert do negócio — é a voz que garante que conteúdo vira conversa, e conversa vira venda.",
    proximoPasso: "Liderar um plano para dobrar a conversão de um lançamento com base no que ouve todos os dias.",
  },
};

export function descricaoDoNivel(nivel: NivelCarreira): DescricaoNivel {
  return DESCRICOES[nivel];
}

export function proximoNivel(nivel: NivelCarreira): NivelCarreira | null {
  const indice = NIVEIS.indexOf(nivel);
  if (indice < 0 || indice >= NIVEIS.length - 1) return null;
  return NIVEIS[indice + 1] ?? null;
}

// Metas semanais de referência do próprio método (manual, capítulo 8). Não
// existe conversão sessão→venda aqui: esta instância não tem conceito de
// venda/pagamento no banco (uso interno, sem cobrança) — só o que dá pra
// medir de verdade com o que o app rastreia.
export const METAS_SEMANAIS = {
  abordagensMin: 150,
  abordagensMax: 200,
  sessoesMin: 10,
  sessoesMax: 15,
  respostaPctMin: 40,
  tempoRespostaHorasMax: 4,
};

export interface MetricasSemana {
  abordagens: number;
  sessoesAgendadas: number;
  respostaPct: number;
  tempoRespostaHoras: number | null;
}

export function nivelAtual(usuarioId: number): NivelCarreira {
  const row = getDb()
    .prepare("SELECT nivel_carreira FROM usuarios WHERE id = ?")
    .get(usuarioId) as { nivel_carreira: string } | undefined;
  const nivel = row?.nivel_carreira ?? "executor";
  return ehNivelValido(nivel) ? nivel : "executor";
}

/** Métricas dos últimos 7 dias, só sobre leads atribuídos a este operador. */
export function calcularMetricasSemana(usuarioId: number): MetricasSemana {
  const db = getDb();
  const desde = "-7 days";

  const abordagens = (
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM leads
         WHERE responsavel_id = ? AND criado_em >= datetime('now','localtime', ?)`,
      )
      .get(usuarioId, desde) as { total: number }
  ).total;

  // "Sessão agendada" não existe como evento — a aproximação é o lead ter
  // chegado numa etapa de papel 'encerra' (saiu das mãos do robô, é onde o
  // operador assume pra fechar) dentro da janela.
  const sessoesAgendadas = (
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM leads l
         JOIN etapas e ON e.id = l.etapa_id
         WHERE l.responsavel_id = ? AND e.papel = 'encerra'
           AND l.atualizado_em >= datetime('now','localtime', ?)`,
      )
      .get(usuarioId, desde) as { total: number }
  ).total;

  const comResposta = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT l.id) AS total FROM leads l
         JOIN mensagens m ON m.lead_id = l.id AND m.remetente = 'lead'
         WHERE l.responsavel_id = ? AND l.criado_em >= datetime('now','localtime', ?)`,
      )
      .get(usuarioId, desde) as { total: number }
  ).total;
  const respostaPct = abordagens > 0 ? Math.round((comResposta / abordagens) * 100) : 0;

  const tempoResposta = db
    .prepare(
      `WITH ordenado AS (
         SELECT m.criado_em,
                m.remetente,
                LAG(m.remetente) OVER (PARTITION BY m.lead_id ORDER BY m.criado_em) AS remetente_anterior,
                LAG(m.criado_em) OVER (PARTITION BY m.lead_id ORDER BY m.criado_em) AS criado_em_anterior
         FROM mensagens m
         JOIN leads l ON l.id = m.lead_id
         WHERE l.responsavel_id = ?
       )
       SELECT AVG((julianday(criado_em) - julianday(criado_em_anterior)) * 24) AS horas
       FROM ordenado
       WHERE remetente_anterior = 'lead' AND remetente IN ('robo','operador')
         AND criado_em >= datetime('now','localtime', ?)`,
    )
    .get(usuarioId, desde) as { horas: number | null };

  return {
    abordagens,
    sessoesAgendadas,
    respostaPct,
    tempoRespostaHoras: tempoResposta.horas === null ? null : Math.round(tempoResposta.horas * 10) / 10,
  };
}

export interface SinalizacaoPromocao {
  pronto: boolean;
  motivos: string[];
}

/**
 * Só sinaliza — nunca promove sozinho. Critério é o piso das metas do
 * método aplicado às métricas dos últimos 7 dias; um admin decide de fato.
 */
export function avaliarSinalizacaoPromocao(usuarioId: number): SinalizacaoPromocao {
  const metricas = calcularMetricasSemana(usuarioId);
  const motivos: string[] = [];

  if (metricas.abordagens < METAS_SEMANAIS.abordagensMin) {
    motivos.push(`Abordagens abaixo da meta (${metricas.abordagens}/${METAS_SEMANAIS.abordagensMin}).`);
  }
  if (metricas.sessoesAgendadas < METAS_SEMANAIS.sessoesMin) {
    motivos.push(`Sessões agendadas abaixo da meta (${metricas.sessoesAgendadas}/${METAS_SEMANAIS.sessoesMin}).`);
  }
  if (metricas.respostaPct < METAS_SEMANAIS.respostaPctMin) {
    motivos.push(`Taxa de resposta abaixo da meta (${metricas.respostaPct}%/${METAS_SEMANAIS.respostaPctMin}%).`);
  }
  if (metricas.tempoRespostaHoras !== null && metricas.tempoRespostaHoras > METAS_SEMANAIS.tempoRespostaHorasMax) {
    motivos.push(
      `Tempo médio de resposta acima da meta (${metricas.tempoRespostaHoras}h/${METAS_SEMANAIS.tempoRespostaHorasMax}h).`,
    );
  }

  return { pronto: motivos.length === 0, motivos };
}

export interface EventoNivel {
  id: number;
  usuario_id: number;
  nivel_anterior: string;
  nivel_novo: string;
  observacao: string;
  criado_por: number | null;
  criado_em: string;
}

export function listarHistoricoNivel(usuarioId: number): EventoNivel[] {
  return getDb()
    .prepare("SELECT * FROM nivel_eventos WHERE usuario_id = ? ORDER BY criado_em DESC")
    .all(usuarioId) as EventoNivel[];
}

/** Promove ou rebaixa — sempre uma ação humana (admin), nunca automática. */
export function definirNivel(
  usuarioId: number,
  novoNivel: NivelCarreira,
  observacao: string,
  criadoPor: number,
): void {
  const db = getDb();
  const nivelAnterior = nivelAtual(usuarioId);

  const transacao = db.transaction(() => {
    db.prepare("UPDATE usuarios SET nivel_carreira = ? WHERE id = ?").run(novoNivel, usuarioId);
    db.prepare(
      `INSERT INTO nivel_eventos (usuario_id, nivel_anterior, nivel_novo, observacao, criado_por)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(usuarioId, nivelAnterior, novoNivel, observacao, criadoPor);
  });
  transacao();
}
