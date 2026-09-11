"use client";

import { useEffect, useState } from "react";

interface WorkspaceDetalhe {
  id: number;
  nome: string;
  slug: string;
  icp: string;
  ofertas: string;
}

interface Limites {
  teto_adicoes_dia: number;
  teto_follows_dia: number;
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: string;
}

interface StatusInstagram {
  conectado: boolean;
  username?: string | null;
  expiraEm?: string;
}

const campoStyle = {
  borderColor: "var(--color-borda)",
  background: "var(--color-superficie)",
};

export function WorkspaceConfig({ workspaceId }: { workspaceId: number }) {
  const [workspace, setWorkspace] = useState<WorkspaceDetalhe | null>(null);
  const [limites, setLimites] = useState<Limites | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [instagram, setInstagram] = useState<StatusInstagram | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const [nomeOperador, setNomeOperador] = useState("");
  const [emailOperador, setEmailOperador] = useState("");
  const [senhaOperador, setSenhaOperador] = useState("");
  const [erroOperador, setErroOperador] = useState<string | null>(null);

  async function carregar() {
    const [respWorkspace, respUsuarios] = await Promise.all([
      fetch(`/api/admin/workspaces/${workspaceId}`),
      fetch(`/api/admin/workspaces/${workspaceId}/usuarios`),
    ]);
    const { workspace, limites, instagram } = (await respWorkspace.json()) as {
      workspace: WorkspaceDetalhe;
      limites: Limites;
      instagram: StatusInstagram;
    };
    const { usuarios } = (await respUsuarios.json()) as { usuarios: Usuario[] };
    setWorkspace(workspace);
    setLimites(limites);
    setUsuarios(usuarios);
    setInstagram(instagram);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !limites) return;
    setSalvando(true);
    setSalvo(false);
    try {
      await fetch(`/api/admin/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp: workspace.icp,
          ofertas: workspace.ofertas,
          tetoAdicoesDia: limites.teto_adicoes_dia,
          tetoFollowsDia: limites.teto_follows_dia,
        }),
      });
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  }

  async function criarOperador(e: React.FormEvent) {
    e.preventDefault();
    setErroOperador(null);
    const resp = await fetch(`/api/admin/workspaces/${workspaceId}/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeOperador, email: emailOperador, senha: senhaOperador }),
    });
    if (!resp.ok) {
      const { erro } = (await resp.json()) as { erro?: string };
      setErroOperador(erro ?? "Não foi possível criar o operador.");
      return;
    }
    setNomeOperador("");
    setEmailOperador("");
    setSenhaOperador("");
    await carregar();
  }

  if (!workspace || !limites) return <p className="text-texto-fraco">Carregando…</p>;

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs" style={{ color: "var(--color-texto-fraco)" }}>
            ICP (perfil de cliente ideal) — alimenta a análise de nota
          </label>
          <textarea
            value={workspace.icp}
            onChange={(e) => setWorkspace({ ...workspace, icp: e.target.value })}
            rows={3}
            className="w-full rounded-md border p-2 text-sm"
            style={campoStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: "var(--color-texto-fraco)" }}>
            Ofertas do negócio
          </label>
          <textarea
            value={workspace.ofertas}
            onChange={(e) => setWorkspace({ ...workspace, ofertas: e.target.value })}
            rows={2}
            className="w-full rounded-md border p-2 text-sm"
            style={campoStyle}
          />
        </div>
        <div className="flex gap-4">
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--color-texto-fraco)" }}>
              Teto de adições/dia
            </label>
            <input
              type="number"
              min={0}
              value={limites.teto_adicoes_dia}
              onChange={(e) => setLimites({ ...limites, teto_adicoes_dia: Number(e.target.value) })}
              className="w-32 rounded-md border p-2 text-sm"
              style={campoStyle}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--color-texto-fraco)" }}>
              Teto de follows/dia
            </label>
            <input
              type="number"
              min={0}
              value={limites.teto_follows_dia}
              onChange={(e) => setLimites({ ...limites, teto_follows_dia: Number(e.target.value) })}
              className="w-32 rounded-md border p-2 text-sm"
              style={campoStyle}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="w-fit rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--color-marca)", color: "white" }}
          >
            {salvando ? "Salvando…" : "Salvar configurações"}
          </button>
          {salvo && (
            <span className="text-sm" style={{ color: "var(--color-ok)" }}>
              Salvo.
            </span>
          )}
        </div>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--color-texto-fraco)" }}>
          Instagram
        </h2>
        {instagram?.conectado ? (
          <div
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
          >
            <p className="text-sm">
              Conectado {instagram.username ? `como @${instagram.username}` : ""}
            </p>
            <span className="text-xs" style={{ color: "var(--color-ok)" }}>
              ativo
            </span>
          </div>
        ) : (
          <a
            href={`/api/instagram/conectar?workspaceId=${workspaceId}`}
            className="inline-block w-fit rounded-md px-3 py-2 text-sm font-medium"
            style={{ background: "var(--color-marca)", color: "white" }}
          >
            Conectar Instagram
          </a>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--color-texto-fraco)" }}>
          Operadores
        </h2>
        <div className="mb-3 flex flex-col gap-2">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border px-4 py-2"
              style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
            >
              <p className="text-sm font-medium">{u.nome}</p>
              <p className="text-xs" style={{ color: "var(--color-texto-fraco)" }}>
                {u.email}
              </p>
            </div>
          ))}
          {usuarios.length === 0 && (
            <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
              Nenhum operador ainda.
            </p>
          )}
        </div>
        <form onSubmit={criarOperador} className="flex flex-wrap gap-2">
          <input
            placeholder="Nome"
            value={nomeOperador}
            onChange={(e) => setNomeOperador(e.target.value)}
            required
            className="rounded-md border px-3 py-2 text-sm"
            style={campoStyle}
          />
          <input
            placeholder="Email"
            type="email"
            value={emailOperador}
            onChange={(e) => setEmailOperador(e.target.value)}
            required
            className="rounded-md border px-3 py-2 text-sm"
            style={campoStyle}
          />
          <input
            placeholder="Senha"
            type="password"
            value={senhaOperador}
            onChange={(e) => setSenhaOperador(e.target.value)}
            required
            className="rounded-md border px-3 py-2 text-sm"
            style={campoStyle}
          />
          <button
            type="submit"
            className="rounded-md px-3 py-2 text-sm font-medium"
            style={{ background: "var(--color-marca)", color: "white" }}
          >
            Criar operador
          </button>
        </form>
        {erroOperador && (
          <p className="mt-2 text-sm" style={{ color: "var(--color-erro)" }}>
            {erroOperador}
          </p>
        )}
      </section>
    </div>
  );
}
