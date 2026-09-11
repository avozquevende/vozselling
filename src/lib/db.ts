import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

// Conexão em cache no globalThis: sobrevive ao hot-reload do Next em dev.
// Em produção, ALTER TABLE novo só roda depois de reiniciar o processo e a
// primeira requisição tocar o banco (ver armadilha no handoff, seção 9).
declare global {
  var __vozSellingDb: Database.Database | undefined;
}

function resolveDbPath(): string {
  if (process.env.DB_PATH) {
    return path.isAbsolute(process.env.DB_PATH)
      ? process.env.DB_PATH
      : path.join(process.cwd(), process.env.DB_PATH);
  }

  // Na Vercel o filesystem do deploy é somente-leitura fora de /tmp — não dá
  // para abrir o SQLite em ./data como na VPS. /tmp funciona para clicar e
  // testar a UI, mas é efêmero: reseta a qualquer momento (cold start, novo
  // deploy, outra instância). Não é onde o produto mora de verdade — é só
  // para dar uma URL de teste rápida. Ver docs/handoff-tecnico.md.
  if (process.env.VERCEL) {
    return "/tmp/dreamrobot.db";
  }

  return path.join(process.cwd(), "./data/dreamrobot.db");
}

function createConnection(): Database.Database {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      ativo INTEGER NOT NULL DEFAULT 1,
      -- ICP e ofertas alimentam a análise do agent-a1 (nota 0-100).
      icp TEXT NOT NULL DEFAULT '',
      ofertas TEXT NOT NULL DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER REFERENCES workspaces(id),
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      papel TEXT NOT NULL CHECK (papel IN ('admin','operador')),
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Escada de carreira do Social Seller (manual "Método VOZ SELLING™",
    -- capítulo 9): executor → intérprete → gestor → expert. Promoção nunca é
    -- automática — carreira.ts só sinaliza quando as métricas batem a meta do
    -- método; quem confirma é sempre um admin, registrado em nivel_eventos.
    CREATE TABLE IF NOT EXISTS nivel_eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      nivel_anterior TEXT NOT NULL,
      nivel_novo TEXT NOT NULL,
      observacao TEXT NOT NULL DEFAULT '',
      criado_por INTEGER REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sessoes (
      token TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      expira_em TEXT NOT NULL
    );

    -- Conta do Instagram conectada por workspace (Instagram Login oficial).
    -- entry.id do webhook é o instagram_business_id — é assim que o webhook
    -- sabe de qual workspace uma mensagem recebida é.
    CREATE TABLE IF NOT EXISTS contas_instagram (
      workspace_id INTEGER PRIMARY KEY REFERENCES workspaces(id),
      instagram_business_id TEXT NOT NULL UNIQUE,
      instagram_username TEXT,
      access_token TEXT NOT NULL,
      token_expira_em TEXT NOT NULL,
      conectado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Etapas são customizáveis por workspace. O comportamento do robô lê o
    -- "papel" declarado, nunca o nome escrito pelo cliente (ver papeis.ts).
    CREATE TABLE IF NOT EXISTS etapas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      nome TEXT NOT NULL,
      papel TEXT NOT NULL CHECK (papel IN ('fila','prepara','conduz','encerra','nutre')),
      ordem INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      etapa_id INTEGER REFERENCES etapas(id),
      instagram_username TEXT NOT NULL,
      nome TEXT,
      nota INTEGER,
      motivo_nota TEXT,
      motivo_parada TEXT,
      mensagens_robo_count INTEGER NOT NULL DEFAULT 0,
      ultimo_falante TEXT CHECK (ultimo_falante IN ('lead','robo','operador')),
      janela_24h_expira_em TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(workspace_id, instagram_username)
    );

    CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      remetente TEXT NOT NULL CHECK (remetente IN ('lead','robo','operador')),
      texto TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Régua de retomada: 7 passos por etapa/motivo, contador zera ao avançar.
    CREATE TABLE IF NOT EXISTS retomada_fila (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      escada TEXT NOT NULL,
      passo INTEGER NOT NULL DEFAULT 1,
      proximo_toque_em TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      post_id TEXT NOT NULL,
      autor_instagram TEXT NOT NULL,
      texto TEXT NOT NULL,
      nota INTEGER,
      acao TEXT CHECK (acao IN ('so_avaliar','responder_post','responder_e_chamar')),
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Log de ações que consomem os freios diários (daily-limits.ts).
    -- Contagem sempre por datetime('now','localtime') — nunca ISO/UTC.
    CREATE TABLE IF NOT EXISTS acoes_prospeccao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      tipo TEXT NOT NULL CHECK (tipo IN ('adicao','follow','resposta','comentario')),
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Freios de volume por workspace (daily-limits.ts). Prospecção (o que o
    -- time inicia) tem teto; atendimento (responder quem veio até você) não.
    CREATE TABLE IF NOT EXISTS limites_workspace (
      workspace_id INTEGER PRIMARY KEY REFERENCES workspaces(id),
      teto_adicoes_dia INTEGER NOT NULL DEFAULT 50,
      teto_follows_dia INTEGER NOT NULL DEFAULT 50
    );

    -- Base de conhecimento do método (o "como o Filippe ensina a vender").
    -- Global, não por workspace: é o método da ferramenta, não do cliente.
    -- Os agentes (agent-a1, agent-piloto, agent-retomada) leem daqui por
    -- cima da lógica estrutural (régua, faixas de nota) que fica no código.
    CREATE TABLE IF NOT EXISTS metodologia (
      chave TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      conteudo TEXT NOT NULL DEFAULT '',
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_leads_workspace_etapa ON leads(workspace_id, etapa_id);
    CREATE INDEX IF NOT EXISTS idx_mensagens_lead ON mensagens(lead_id, criado_em);
    CREATE INDEX IF NOT EXISTS idx_retomada_ativo ON retomada_fila(ativo, proximo_toque_em);
    CREATE INDEX IF NOT EXISTS idx_acoes_workspace_tipo_data ON acoes_prospeccao(workspace_id, tipo, criado_em);
  `);

  runMigrations(db);

  // Depende de coluna criada em runMigrations — precisa rodar depois.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_workspace_igsid
      ON leads(workspace_id, instagram_scoped_id)
      WHERE instagram_scoped_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON leads(responsavel_id);
    CREATE INDEX IF NOT EXISTS idx_nivel_eventos_usuario ON nivel_eventos(usuario_id, criado_em);
  `);

  return db;
}

// Migrações incrementais. ALTER TABLE ... ADD COLUMN falha se a coluna já
// existe — cada uma roda isolada e ignora esse erro específico.
function runMigrations(db: Database.Database): void {
  const migrations: string[] = [
    "ALTER TABLE leads ADD COLUMN motivo_nota TEXT",
    "ALTER TABLE leads ADD COLUMN concorrente INTEGER NOT NULL DEFAULT 0",
    // ID do lead do lado da Meta (IGSID) — é o que o webhook manda, nunca o
    // username. Resolve o username via Graph API na primeira mensagem.
    "ALTER TABLE leads ADD COLUMN instagram_scoped_id TEXT",
    "ALTER TABLE leads ADD COLUMN responsavel_id INTEGER REFERENCES usuarios(id)",
    // executor | interprete | gestor | expert — ver lib/carreira.ts.
    "ALTER TABLE usuarios ADD COLUMN nivel_carreira TEXT NOT NULL DEFAULT 'executor'",
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("duplicate column name")) {
        throw err;
      }
    }
  }
}

export function getDb(): Database.Database {
  if (!globalThis.__vozSellingDb) {
    globalThis.__vozSellingDb = createConnection();
  }
  return globalThis.__vozSellingDb;
}

export function nowLocal(): string {
  const row = getDb()
    .prepare("SELECT datetime('now','localtime') AS agora")
    .get() as { agora: string };
  return row.agora;
}
