"use client";

import { useState } from "react";
import { useConfirmar } from "@/app/components/confirmar";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/app/components/classes-botao";

export interface UsuarioLinha {
  id: number;
  email: string;
  nome: string;
  papel: string;
  workspace_id: number | null;
  workspace_nome: string | null;
  must_change_password: number;
  criado_em: string;
  sessoes: number;
}

export interface WorkspaceOpcao {
  id: number;
  nome: string;
}

const inputCls =
  "w-full min-h-11 bg-surface2 border border-linestrong px-3 text-sm text-ink placeholder:text-steel focus:border-accent outline-none";

/**
 * A senha aparece uma vez só, e some da tela quando o dono fecha o aviso.
 * Perder este texto significa gerar outra senha e avisar a pessoa de novo.
 */
function SenhaGerada({
  email,
  senha,
  provisoria,
  onFechar,
}: {
  email: string;
  senha: string;
  provisoria: boolean;
  onFechar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="border border-accent/60 bg-accent/5 p-5 mb-5">
      <div className="eyebrow text-accent mb-1">Anote agora — não dá para ver de novo</div>
      <p className="text-sm text-muted mb-3">
        Envie para <strong className="text-ink">{email}</strong>.{" "}
        {provisoria
          ? "É provisória: no primeiro login a pessoa define a dela."
          : "Ela já entra valendo, sem tela de troca."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-[family-name:var(--font-mono)] text-lg text-accentink bg-surface2 px-3 py-2 border border-linestrong select-all">
          {senha}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(senha);
            setCopiado(true);
          }}
          className="min-h-11 px-4 text-sm border border-accent/60 text-accentink rounded-full hover:bg-accent/10 transition-colors"
        >
          {copiado ? "Copiado" : "Copiar"}
        </button>
        <button
          type="button"
          onClick={onFechar}
          className="min-h-11 px-4 text-sm text-muted hover:text-ink"
        >
          Já anotei
        </button>
      </div>
    </div>
  );
}

export function AcessosPanel({
  usuarios: iniciais,
  workspaces,
  meuId,
}: {
  usuarios: UsuarioLinha[];
  workspaces: WorkspaceOpcao[];
  meuId: number;
}) {
  const { confirmar, dialogo } = useConfirmar();
  const [usuarios, setUsuarios] = useState(iniciais);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<"operador" | "admin">("operador");
  const [wsId, setWsId] = useState<number>(workspaces[0]?.id ?? 0);
  const [senhaManual, setSenhaManual] = useState("");
  const [gerada, setGerada] = useState<{ email: string; senha: string; provisoria: boolean } | null>(
    null,
  );
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function recarregar() {
    const res = await fetch("/api/admin/usuarios");
    if (res.ok) {
      const { usuarios } = (await res.json()) as { usuarios: UsuarioLinha[] };
      setUsuarios(usuarios);
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOcupado(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          nome,
          papel,
          workspace_id: papel === "operador" ? wsId : undefined,
          senha: senhaManual || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "não foi possível criar o acesso");
        return;
      }
      setGerada({ email: data.email, senha: data.senha, provisoria: data.provisoria });
      setEmail("");
      setNome("");
      setSenhaManual("");
      await recarregar();
    } finally {
      setOcupado(false);
    }
  }

  async function resetar(u: UsuarioLinha) {
    setErro("");
    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetar: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErro(data.erro ?? "não foi possível gerar a senha");
      return;
    }
    setGerada({ email: u.email, senha: data.senha, provisoria: true });
    await recarregar();
  }

  async function remover(u: UsuarioLinha) {
    const ok = await confirmar({
      titulo: `Remover o acesso de ${u.email}?`,
      oQueVaiAcontecer:
        "A pessoa perde o login imediatamente — na próxima vez que abrir a ferramenta, cai na tela de entrada.",
      oQuePermanece:
        "os leads e as conversas do workspace ficam intactos. Isto tira o acesso da pessoa, não o trabalho dela.",
      confirmar: "Remover acesso",
      perigo: true,
    });
    if (!ok) return;
    setErro("");
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(data.erro ?? "não foi possível remover");
      return;
    }
    await recarregar();
  }

  return (
    <div>
      {dialogo}
      {gerada && (
        <SenhaGerada
          email={gerada.email}
          senha={gerada.senha}
          provisoria={gerada.provisoria}
          onFechar={() => setGerada(null)}
        />
      )}

      <form onSubmit={criar} className="border border-linestrong bg-surface p-5 mb-8">
        <h2 className="eyebrow text-steel mb-4">Novo acesso</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-muted">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@empresa.com"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-muted">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como chamar essa pessoa"
              required
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-muted">Tipo</span>
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as "operador" | "admin")}
              className={inputCls}
            >
              <option value="operador">Operador — vê só o workspace dele</option>
              <option value="admin">Admin — vê tudo</option>
            </select>
          </label>
          {papel === "operador" && (
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow text-muted">Workspace</span>
              <select
                value={wsId}
                onChange={(e) => setWsId(Number(e.target.value))}
                className={inputCls}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="eyebrow text-muted">Senha (opcional)</span>
            <input
              value={senhaManual}
              onChange={(e) => setSenhaManual(e.target.value)}
              placeholder="deixe vazio para gerar uma provisória"
              className={inputCls}
            />
          </label>
        </div>
        {erro && (
          <p role="alert" className="text-sm text-danger mt-3">
            {erro}
          </p>
        )}
        <button type="submit" disabled={ocupado} className={`${BTN_PRIMARIO} mt-4`}>
          {ocupado ? "Criando…" : "Criar acesso"}
        </button>
      </form>

      <h2 className="eyebrow text-steel mb-3">Quem tem acesso ({usuarios.length})</h2>
      <div className="border border-linestrong bg-surface divide-y divide-line">
        {usuarios.map((u) => (
          <div key={u.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-[family-name:var(--font-mono)] text-sm break-all">
                {u.email}
                {u.id === meuId && <span className="ml-2 eyebrow text-accent">você</span>}
              </div>
              <div className="text-xs text-muted mt-0.5">
                {u.nome && <span>{u.nome} · </span>}
                {u.papel === "admin" ? (
                  "Admin"
                ) : u.workspace_id ? (
                  <a
                    href={`/admin/workspaces/${u.workspace_id}`}
                    className="text-accentink hover:text-accent"
                  >
                    {u.workspace_nome}
                  </a>
                ) : (
                  "sem workspace"
                )}
                {u.must_change_password === 1 && (
                  <span className="text-accentink"> · senha provisória</span>
                )}
                {u.sessoes > 0 && <span> · {u.sessoes} sessão(ões) aberta(s)</span>}
              </div>
            </div>
            <button type="button" onClick={() => resetar(u)} className={BTN_SECUNDARIO}>
              Gerar nova senha
            </button>
            {u.id !== meuId && (
              <button
                type="button"
                onClick={() => remover(u)}
                className="min-h-11 px-4 text-sm text-muted hover:text-danger"
              >
                Remover
              </button>
            )}
          </div>
        ))}
        {usuarios.length === 0 && (
          <p className="px-5 py-4 text-sm text-muted">Nenhum acesso ainda.</p>
        )}
      </div>
    </div>
  );
}
