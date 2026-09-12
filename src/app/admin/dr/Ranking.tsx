"use client";

import { useEffect, useState } from "react";
import type { EtapaPainel, LeadPainel } from "./tipos";
import { BTN_PRIMARIO_MIUDO, BTN_SECUNDARIO_MIUDO } from "@/app/components/classes-botao";

// A nota é a única coisa do produto que muda de cor por categoria — todo o
// resto usa a linguagem de estado (ok/atenção/erro). Ver spec, seção 03.
function corDaNota(nota: number | null): string {
  if (nota === null) return "var(--color-steel)";
  if (nota >= 90) return "var(--color-nota-alta)";
  if (nota >= 70) return "var(--color-nota-media)";
  if (nota >= 50) return "var(--color-nota-parcial)";
  if (nota >= 30) return "var(--color-nota-fraca)";
  return "var(--color-nota-fora)";
}

export function Ranking({ workspaceId }: { workspaceId: number }) {
  const [leads, setLeads] = useState<LeadPainel[]>([]);
  const [etapas, setEtapas] = useState<EtapaPainel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [respLeads, respEtapas] = await Promise.all([
        fetch(`/api/leads?workspaceId=${workspaceId}`),
        fetch(`/api/etapas?workspaceId=${workspaceId}`),
      ]);
      const { leads } = (await respLeads.json()) as { leads: LeadPainel[] };
      const { etapas } = (await respEtapas.json()) as { etapas: EtapaPainel[] };
      setLeads(leads);
      setEtapas(etapas);
    } catch {
      setErro("Não foi possível carregar o Ranking.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function analisarLead(leadId: number) {
    setAnalisando(leadId);
    try {
      await fetch(`/api/leads/${leadId}/analisar`, { method: "POST" });
      await carregar();
    } finally {
      setAnalisando(null);
    }
  }

  async function ativarLead(leadId: number) {
    const primeiraEtapaAtiva = etapas.find((e) => e.papel === "prepara");
    if (!primeiraEtapaAtiva) return;
    await fetch("/api/pipeline/mover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, etapaId: primeiraEtapaAtiva.id }),
    });
    carregar();
  }

  const naFila = leads
    .filter((l) => l.etapa_papel === "fila")
    .sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));

  if (carregando) return <p className="text-sm text-muted">Carregando Ranking…</p>;
  if (erro) return <p className="text-sm text-danger">{erro}</p>;

  return (
    <div className="border border-linestrong bg-surface divide-y divide-line">
      {naFila.length === 0 && <p className="px-5 py-4 text-sm text-muted">Ninguém na fila do Ranking ainda.</p>}
      {naFila.map((lead) => (
        <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0"
              style={{ background: corDaNota(lead.nota), color: "var(--color-bg)" }}
            >
              {lead.nota ?? "–"}
            </span>
            <div>
              <p className="text-sm font-medium">
                @{lead.instagram_username}
                {lead.concorrente === 1 && <span className="ml-2 eyebrow text-warn">concorrente</span>}
              </p>
              {lead.nome && <p className="text-sm text-muted">{lead.nome}</p>}
              {lead.motivo_nota && <p className="text-xs text-muted mt-0.5">{lead.motivo_nota}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => analisarLead(lead.id)}
              disabled={analisando === lead.id}
              className={BTN_SECUNDARIO_MIUDO}
            >
              {analisando === lead.id ? "Analisando…" : lead.nota === null ? "Analisar" : "Reanalisar"}
            </button>
            <button onClick={() => ativarLead(lead.id)} className={BTN_PRIMARIO_MIUDO}>
              Ativar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
