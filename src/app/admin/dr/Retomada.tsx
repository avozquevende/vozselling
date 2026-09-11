"use client";

import { useEffect, useState } from "react";
import type { ItemRetomadaPainel } from "./tipos";

export function Retomada({ workspaceId }: { workspaceId: number }) {
  const [itens, setItens] = useState<ItemRetomadaPainel[]>([]);
  const [processando, setProcessando] = useState<number | null>(null);
  const [ultimoTexto, setUltimoTexto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const resp = await fetch(`/api/retomada?workspaceId=${workspaceId}`);
    const { prontos } = (await resp.json()) as { prontos: ItemRetomadaPainel[] };
    setItens(prontos);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function processar(itemId: number) {
    setProcessando(itemId);
    try {
      const resp = await fetch("/api/retomada/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const resultado = (await resp.json()) as { texto?: string };
      setUltimoTexto(resultado.texto ?? null);
      await carregar();
    } finally {
      setProcessando(null);
    }
  }

  if (carregando) return <p className="text-texto-fraco">Carregando Retomada…</p>;

  return (
    <div className="flex flex-col gap-3">
      {ultimoTexto && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{ borderColor: "var(--color-marca)", background: "var(--color-superficie)" }}
        >
          <p style={{ color: "var(--color-texto-fraco)" }}>Último toque gerado:</p>
          <p>{ultimoTexto}</p>
        </div>
      )}
      {itens.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
          Nenhum toque de retomada pronto agora.
        </p>
      )}
      {itens.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border px-4 py-3"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        >
          <div>
            <p className="font-medium">{item.escada.replaceAll("_", " ")}</p>
            <p className="text-xs" style={{ color: "var(--color-texto-fraco)" }}>
              passo {item.passo}/7 · lead #{item.lead_id}
            </p>
          </div>
          <button
            onClick={() => processar(item.id)}
            disabled={processando === item.id}
            className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--color-marca)", color: "white" }}
          >
            {processando === item.id ? "Gerando…" : "Processar toque"}
          </button>
        </div>
      ))}
    </div>
  );
}
