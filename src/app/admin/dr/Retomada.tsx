"use client";

import { useEffect, useState } from "react";
import type { ItemRetomadaPainel } from "./tipos";
import { BTN_PRIMARIO_MIUDO } from "@/app/components/classes-botao";

// workspaceId omitido = visão global do admin (todos os clientes juntos).
export function Retomada({ workspaceId }: { workspaceId?: number }) {
  const [itens, setItens] = useState<ItemRetomadaPainel[]>([]);
  const [processando, setProcessando] = useState<number | null>(null);
  const [ultimoTexto, setUltimoTexto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const qs = workspaceId ? `?workspaceId=${workspaceId}` : "";
    const resp = await fetch(`/api/retomada${qs}`);
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

  if (carregando) return <p className="text-sm text-muted">Carregando Retomada…</p>;

  return (
    <div className="flex flex-col gap-3">
      {ultimoTexto && (
        <div className="border border-accent/40 bg-accent/5 p-3 text-sm">
          <p className="text-muted">Último toque gerado:</p>
          <p>{ultimoTexto}</p>
        </div>
      )}
      <div className="border border-linestrong bg-surface divide-y divide-line">
        {itens.length === 0 && <p className="px-5 py-4 text-sm text-muted">Nenhum toque de retomada pronto agora.</p>}
        {itens.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-sm font-medium">
                {item.escada.replaceAll("_", " ")}
                {item.workspace_nome && <span className="ml-2 eyebrow text-accent">{item.workspace_nome}</span>}
              </p>
              <p className="text-xs text-muted mt-0.5">
                passo {item.passo}/7 · {item.instagram_username ? `@${item.instagram_username}` : `lead #${item.lead_id}`}
              </p>
            </div>
            <button
              onClick={() => processar(item.id)}
              disabled={processando === item.id}
              className={BTN_PRIMARIO_MIUDO}
            >
              {processando === item.id ? "Gerando…" : "Processar toque"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
