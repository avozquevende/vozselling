import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "./db";

const COOKIE_NOME = "vs_sessao";
const SESSAO_DIAS = 30;

export type Papel = "admin" | "operador";

export interface Usuario {
  id: number;
  workspace_id: number | null;
  nome: string;
  email: string;
  papel: Papel;
}

export class ErroApi extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarSenha(senha: string, senhaHash: string): boolean {
  const [salt, hash] = senhaHash.split(":");
  if (!salt || !hash) return false;
  const hashCalculado = scryptSync(senha, salt, 64);
  const hashArmazenado = Buffer.from(hash, "hex");
  if (hashCalculado.length !== hashArmazenado.length) return false;
  return timingSafeEqual(hashCalculado, hashArmazenado);
}

function linhaParaUsuario(row: unknown): Usuario {
  const r = row as {
    id: number;
    workspace_id: number | null;
    nome: string;
    email: string;
    papel: string;
  };
  return { ...r, papel: r.papel as Papel };
}

export async function criarSessao(usuarioId: number): Promise<void> {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  db.prepare(
    `INSERT INTO sessoes (token, usuario_id, expira_em)
     VALUES (?, ?, datetime('now','localtime', ?))`,
  ).run(token, usuarioId, `+${SESSAO_DIAS} days`);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NOME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSAO_DIAS * 24 * 60 * 60,
  });
}

export async function destruirSessao(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NOME)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessoes WHERE token = ?").run(token);
  }
  cookieStore.delete(COOKIE_NOME);
}

export async function usuarioDaSessao(): Promise<Usuario | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NOME)?.value;
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.workspace_id, u.nome, u.email, u.papel
       FROM sessoes s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token = ? AND s.expira_em > datetime('now','localtime')`,
    )
    .get(token);

  return row ? linhaParaUsuario(row) : null;
}

/** Uso em rotas de API: lança ErroApi(401) se não houver sessão válida. */
export async function requireApiUser(): Promise<Usuario> {
  const usuario = await usuarioDaSessao();
  if (!usuario) {
    throw new ErroApi(401, "Sessão inválida ou expirada.");
  }
  return usuario;
}

/** Uso em rotas de API: exige papel admin. */
export async function requireAdmin(): Promise<Usuario> {
  const usuario = await requireApiUser();
  if (usuario.papel !== "admin") {
    throw new ErroApi(403, "Requer acesso de administrador.");
  }
  return usuario;
}

/**
 * admin acessa qualquer workspace (uso interno, suporte); operador só o
 * próprio. Escrita em qualquer rota exige isto — é o que fecha vazamento de
 * dado entre workspaces (handoff, seção 10).
 */
export function canAccessWorkspace(usuario: Usuario, workspaceId: number): boolean {
  if (usuario.papel === "admin") return true;
  return usuario.workspace_id === workspaceId;
}

export function requireWorkspaceAccess(usuario: Usuario, workspaceId: number): void {
  if (!canAccessWorkspace(usuario, workspaceId)) {
    throw new ErroApi(403, "Sem acesso a este workspace.");
  }
}
