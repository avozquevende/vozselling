"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BTN_PRIMARIO } from "@/app/components/classes-botao";

interface Workspace {
  id: number;
  nome: string;
  slug: string;
  ativo: number;
  criado_em: string;
}

const inputCls =
  "min-h-11 bg-surface2 border border-linestrong px-3 text-sm text-ink placeholder:text-steel focus:border-accent outline-none";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    const resp = await fetch("/api/admin/workspaces");
    const { workspaces } = (await resp.json()) as { workspaces: Workspace[] };
    setWorkspaces(workspaces);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await fetch("/api/admin/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, slug }),
      });
      setNome("");
      setSlug("");
      await carregar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <span className="eyebrow text-accent">Admin · Sua carteira</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          Clientes
        </h1>
      </header>

      <form onSubmit={criar} className="border border-linestrong bg-surface p-5 mb-8 flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">Nome do cliente</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">Slug</span>
          <input
            placeholder="academia-x"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <button type="submit" disabled={enviando} className={BTN_PRIMARIO}>
          Criar workspace
        </button>
      </form>

      <div className="border border-linestrong bg-surface divide-y divide-line">
        {workspaces.map((w) => (
          <Link
            key={w.id}
            href={`/admin/workspaces/${w.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-surface2/60 transition-colors"
          >
            <div>
              <p className="font-medium text-sm">{w.nome}</p>
              <p className="text-xs text-muted mt-0.5 font-[family-name:var(--font-mono)]">{w.slug}</p>
            </div>
            <span className={`eyebrow ${w.ativo ? "text-ok" : "text-steel"}`}>
              {w.ativo ? "ativo" : "inativo"}
            </span>
          </Link>
        ))}
        {workspaces.length === 0 && <p className="px-5 py-4 text-sm text-muted">Nenhum workspace ainda.</p>}
      </div>
    </div>
  );
}
