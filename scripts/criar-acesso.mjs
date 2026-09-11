#!/usr/bin/env node
// Cria um usuário de acesso local (admin ou operador).
// Uso: node scripts/criar-acesso.mjs --email voce@x.com --papel admin --nome "Voce"
//      node scripts/criar-acesso.mjs --email op@x.com --papel operador --nome "Op" --workspace-slug academia-x

import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import Database from "better-sqlite3";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const chave = argv[i]?.replace(/^--/, "");
    if (chave) args[chave] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.email || !args.papel || !args.nome) {
  console.error("Uso: node scripts/criar-acesso.mjs --email X --papel admin|operador --nome \"Nome\" [--workspace-slug slug] [--senha senha]");
  process.exit(1);
}
if (args.papel !== "admin" && args.papel !== "operador") {
  console.error('--papel deve ser "admin" ou "operador".');
  process.exit(1);
}
if (args.papel === "operador" && !args["workspace-slug"]) {
  console.error("--workspace-slug é obrigatório para papel operador.");
  process.exit(1);
}

const dbPath = process.env.DB_PATH ?? "./data/dreamrobot.db";
const db = new Database(path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath));
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plano_id INTEGER,
    ativo INTEGER NOT NULL DEFAULT 1,
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
`);

let workspaceId = null;
if (args.papel === "operador") {
  const slug = args["workspace-slug"];
  const existente = db.prepare("SELECT id FROM workspaces WHERE slug = ?").get(slug);
  if (existente) {
    workspaceId = existente.id;
  } else {
    const resultado = db
      .prepare("INSERT INTO workspaces (nome, slug) VALUES (?, ?)")
      .run(args.nome, slug);
    workspaceId = resultado.lastInsertRowid;
    console.log(`Workspace "${slug}" criado (id ${workspaceId}).`);
  }
}

const senha = args.senha ?? randomBytes(9).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(senha, salt, 64).toString("hex");
const senhaHash = `${salt}:${hash}`;

db.prepare(
  `INSERT INTO usuarios (workspace_id, nome, email, senha_hash, papel)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(email) DO UPDATE SET
     nome = excluded.nome, senha_hash = excluded.senha_hash, papel = excluded.papel, workspace_id = excluded.workspace_id`,
).run(workspaceId, args.nome, args.email, senhaHash, args.papel);

console.log(`Acesso criado: ${args.email} (${args.papel})`);
if (!args.senha) {
  console.log(`Senha gerada: ${senha}`);
}
