"use client";

import { useEffect, useState } from "react";
import { Carreira } from "@/app/admin/dr/Carreira";
import { BTN_PRIMARIO, BTN_DESTRUTIVO } from "@/app/components/classes-botao";

interface WorkspaceDetalhe {
  id: number;
  nome: string;
  slug: string;
  icp: string;
  ofertas: string;
  automacao_pausada: number;
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

const inputCls =
  "w-full min-h-11 bg-surface2 border border-linestrong px-3 text-sm text-ink placeholder:text-steel focus:border-accent outline-none";
const inputSmallCls =
  "min-h-11 bg-surface2 border border-linestrong px-3 text-sm text-ink placeholder:text-steel focus:border-accent outline-none";

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
  const [carreiraAberta, setCarreiraAberta] = useState<number | null>(null);
  const [pausando, setPausando] = useState(false);

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

  async function alternarAutomacao() {
    if (!workspace) return;
    const pausar = workspace.automacao_pausada === 0;
    setPausando(true);
    try {
      await fetch(`/api/admin/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automacaoPausada: pausar }),
      });
      setWorkspace({ ...workspace, automacao_pausada: pausar ? 1 : 0 });
    } finally {
      setPausando(false);
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

  if (!workspace || !limites) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border p-4 ${
          workspace.automacao_pausada === 1 ? "border-danger/60 bg-danger/10" : "border-linestrong bg-surface"
        }`}
      >
        <div>
          <p className="eyebrow text-muted">Automação (piloto + retomada)</p>
          <p className="text-sm mt-1">
            {workspace.automacao_pausada === 1 ? (
              <span className="text-danger font-medium">Pausada — o robô não responde nem retoma ninguém agora.</span>
            ) : (
              "Rodando normalmente."
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={alternarAutomacao}
          disabled={pausando}
          className={workspace.automacao_pausada === 1 ? BTN_PRIMARIO : BTN_DESTRUTIVO}
        >
          {pausando ? "Aplicando…" : workspace.automacao_pausada === 1 ? "Retomar automação" : "Parar tudo"}
        </button>
      </div>

      <form onSubmit={salvar} className="border border-linestrong bg-surface p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">ICP (perfil de cliente ideal) — alimenta a análise de nota</span>
          <textarea
            value={workspace.icp}
            onChange={(e) => setWorkspace({ ...workspace, icp: e.target.value })}
            rows={3}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">Ofertas do negócio</span>
          <textarea
            value={workspace.ofertas}
            onChange={(e) => setWorkspace({ ...workspace, ofertas: e.target.value })}
            rows={2}
            className={inputCls}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-muted">Teto de adições/dia</span>
            <input
              type="number"
              min={0}
              value={limites.teto_adicoes_dia}
              onChange={(e) => setLimites({ ...limites, teto_adicoes_dia: Number(e.target.value) })}
              className={`w-32 ${inputSmallCls}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-muted">Teto de follows/dia</span>
            <input
              type="number"
              min={0}
              value={limites.teto_follows_dia}
              onChange={(e) => setLimites({ ...limites, teto_follows_dia: Number(e.target.value) })}
              className={`w-32 ${inputSmallCls}`}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={salvando} className={BTN_PRIMARIO}>
            {salvando ? "Salvando…" : "Salvar configurações"}
          </button>
          {salvo && <span className="text-sm text-ok">Salvo.</span>}
        </div>
      </form>

      <section>
        <h2 className="eyebrow text-steel mb-3">Instagram</h2>
        {instagram?.conectado ? (
          <div className="flex items-center justify-between border border-linestrong bg-surface px-5 py-4">
            <p className="text-sm">
              Conectado {instagram.username ? `como @${instagram.username}` : ""}
            </p>
            <span className="eyebrow text-ok">ativo</span>
          </div>
        ) : (
          <a href={`/api/instagram/conectar?workspaceId=${workspaceId}`} className={BTN_PRIMARIO}>
            Conectar Instagram
          </a>
        )}
      </section>

      <section>
        <h2 className="eyebrow text-steel mb-3">Operadores</h2>
        <div className="mb-4 border border-linestrong bg-surface divide-y divide-line">
          {usuarios.map((u) => (
            <div key={u.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium">{u.nome}</p>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted font-[family-name:var(--font-mono)]">{u.email}</p>
                  {u.papel === "operador" && (
                    <button
                      onClick={() => setCarreiraAberta(carreiraAberta === u.id ? null : u.id)}
                      className="text-xs font-medium underline text-accentink hover:text-accent"
                    >
                      {carreiraAberta === u.id ? "fechar carreira" : "ver carreira"}
                    </button>
                  )}
                </div>
              </div>
              {carreiraAberta === u.id && (
                <div className="mt-3">
                  <Carreira endpoint={`/api/admin/usuarios/${u.id}/carreira`} podeEditar />
                </div>
              )}
            </div>
          ))}
          {usuarios.length === 0 && <p className="px-5 py-4 text-sm text-muted">Nenhum operador ainda.</p>}
        </div>
        <form onSubmit={criarOperador} className="flex flex-wrap gap-2">
          <input
            placeholder="Nome"
            value={nomeOperador}
            onChange={(e) => setNomeOperador(e.target.value)}
            required
            className={inputSmallCls}
          />
          <input
            placeholder="Email"
            type="email"
            value={emailOperador}
            onChange={(e) => setEmailOperador(e.target.value)}
            required
            className={inputSmallCls}
          />
          <input
            placeholder="Senha"
            type="password"
            value={senhaOperador}
            onChange={(e) => setSenhaOperador(e.target.value)}
            required
            className={inputSmallCls}
          />
          <button type="submit" className={BTN_PRIMARIO}>
            Criar operador
          </button>
        </form>
        {erroOperador && <p className="mt-2 text-sm text-danger">{erroOperador}</p>}
      </section>
    </div>
  );
}
