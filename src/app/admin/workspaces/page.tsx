"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Workspace {
  id: number;
  nome: string;
  slug: string;
  ativo: number;
  criado_em: string;
}

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
    <div className="flex flex-col gap-6">
      <form onSubmit={criar} className="flex gap-2">
        <input
          placeholder="Nome do cliente"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        />
        <input
          placeholder="slug (ex: academia-x)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--color-marca)", color: "white" }}
        >
          Criar workspace
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {workspaces.map((w) => (
          <Link
            key={w.id}
            href={`/admin/workspaces/${w.id}`}
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
          >
            <div>
              <p className="font-medium">{w.nome}</p>
              <p className="text-xs" style={{ color: "var(--color-texto-fraco)" }}>
                {w.slug}
              </p>
            </div>
            <span className="text-xs" style={{ color: "var(--color-texto-fraco)" }}>
              {w.ativo ? "ativo" : "inativo"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
