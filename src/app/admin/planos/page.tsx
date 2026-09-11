"use client";

import { useEffect, useState } from "react";

interface Plano {
  id: number;
  nome: string;
  preco_centavos: number;
  modulos: string;
}

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    const resp = await fetch("/api/admin/planos");
    const { planos } = (await resp.json()) as { planos: Plano[] };
    setPlanos(planos);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await fetch("/api/admin/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, precoCentavos: Math.round(Number(preco) * 100) }),
      });
      setNome("");
      setPreco("");
      await carregar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={criar} className="flex gap-2">
        <input
          placeholder="Nome do plano"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        />
        <input
          placeholder="Preço (R$)"
          type="number"
          step="0.01"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
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
          Criar plano
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {planos.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
          >
            <p className="font-medium">{p.nome}</p>
            <p style={{ color: "var(--color-texto-fraco)" }}>
              R$ {(p.preco_centavos / 100).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
