import { getDb } from "./db";

// Base de conhecimento do método (as aulas/contextos do Filippe). Global —
// é o método da própria ferramenta, não uma config por cliente como
// icp/ofertas do workspace. Os agentes combinam isto com a régua e as
// faixas de nota, que continuam sendo regra estrutural no código: o
// conteúdo daqui é a voz e a tática, não o que decide se o robô pode falar.

export interface SecaoMetodologia {
  chave: string;
  titulo: string;
  conteudo: string;
  atualizado_em: string;
}

// As chaves batem com os modos da régua do relógio (piloto.ts) e as
// escadas de retomada (retomada.ts) — é aqui que o texto de cada uma entra.
export const SECOES_PADRAO: Array<{ chave: string; titulo: string }> = [
  { chave: "tom_de_voz", titulo: "Tom de voz geral" },
  { chave: "qualificacao", titulo: "Qualificação — nota 0 a 100" },
  { chave: "conexao", titulo: "Conexão (piloto)" },
  { chave: "conducao", titulo: "Condução (piloto)" },
  { chave: "convite", titulo: "Convite (piloto)" },
  { chave: "agendamento", titulo: "Agendamento (piloto)" },
  { chave: "retomada_ativacao_nao_respondeu", titulo: "Retomada — Ativação · não respondeu" },
  { chave: "retomada_conexao_esfriou", titulo: "Retomada — Conexão · esfriou" },
  { chave: "retomada_conducao_sentiu_venda", titulo: "Retomada — Condução · sentiu venda" },
  { chave: "retomada_agendamento", titulo: "Retomada — Agendando / Agendado" },
  { chave: "retomada_proposta_aberta", titulo: "Retomada — Proposta aberta" },
  { chave: "retomada_sem_caixa", titulo: "Retomada — Sem caixa" },
  { chave: "retomada_nao_prioridade", titulo: "Retomada — Não é prioridade" },
];

/** Idempotente: cria as linhas padrão (vazias) se ainda não existirem. */
export function garantirSecoesPadrao(): void {
  const db = getDb();
  const inserir = db.prepare(
    `INSERT INTO metodologia (chave, titulo, conteudo) VALUES (?, ?, '')
     ON CONFLICT(chave) DO NOTHING`,
  );
  const transacao = db.transaction(() => {
    for (const secao of SECOES_PADRAO) {
      inserir.run(secao.chave, secao.titulo);
    }
  });
  transacao();
}

export function listarSecoes(): SecaoMetodologia[] {
  garantirSecoesPadrao();
  return getDb().prepare("SELECT * FROM metodologia ORDER BY rowid ASC").all() as SecaoMetodologia[];
}

/** Retorna '' quando a seção ainda não tem conteúdo — chamar sempre é seguro. */
export function buscarSecao(chave: string): string {
  const row = getDb().prepare("SELECT conteudo FROM metodologia WHERE chave = ?").get(chave) as
    | { conteudo: string }
    | undefined;
  return row?.conteudo ?? "";
}

export function salvarSecao(chave: string, conteudo: string): void {
  const db = getDb();
  const existente = db.prepare("SELECT chave FROM metodologia WHERE chave = ?").get(chave);
  if (!existente) {
    const titulo = SECOES_PADRAO.find((s) => s.chave === chave)?.titulo ?? chave;
    db.prepare("INSERT INTO metodologia (chave, titulo, conteudo) VALUES (?, ?, ?)").run(
      chave,
      titulo,
      conteudo,
    );
    return;
  }
  db.prepare(
    "UPDATE metodologia SET conteudo = ?, atualizado_em = datetime('now','localtime') WHERE chave = ?",
  ).run(conteudo, chave);
}
