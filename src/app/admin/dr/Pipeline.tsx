"use client";

import { useEffect, useState } from "react";
import type { EtapaPainel, LeadPainel } from "./tipos";

interface Colega {
  id: number;
  nome: string;
}

const selectCls = "mt-2 w-full bg-surface2 border border-linestrong p-1.5 text-xs text-ink";

export function Pipeline({ workspaceId }: { workspaceId: number }) {
  const [leads, setLeads] = useState<LeadPainel[]>([]);
  const [etapas, setEtapas] = useState<EtapaPainel[]>([]);
  const [colegas, setColegas] = useState<Colega[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const [respLeads, respEtapas, respColegas] = await Promise.all([
      fetch(`/api/leads?workspaceId=${workspaceId}`),
      fetch(`/api/etapas?workspaceId=${workspaceId}`),
      fetch(`/api/usuarios/colegas?workspaceId=${workspaceId}`),
    ]);
    const { leads } = (await respLeads.json()) as { leads: LeadPainel[] };
    const { etapas } = (await respEtapas.json()) as { etapas: EtapaPainel[] };
    const { usuarios } = (await respColegas.json()) as { usuarios: Colega[] };
    setLeads(leads);
    setEtapas(etapas.filter((e) => e.papel !== "fila").sort((a, b) => a.ordem - b.ordem));
    setColegas(usuarios);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function mover(leadId: number, etapaId: number) {
    await fetch("/api/pipeline/mover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, etapaId }),
    });
    carregar();
  }

  async function atribuir(leadId: number, responsavelId: number | null) {
    await fetch(`/api/leads/${leadId}/responsavel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsavelId }),
    });
    carregar();
  }

  if (carregando) return <p className="text-sm text-muted">Carregando Pipeline…</p>;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {etapas.map((etapa) => {
        const leadsDaEtapa = leads.filter((l) => l.etapa_id === etapa.id);
        return (
          <div key={etapa.id} className="flex w-64 shrink-0 flex-col gap-2 border border-linestrong bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{etapa.nome}</p>
              <span className="eyebrow text-muted">{leadsDaEtapa.length}</span>
            </div>
            <p className="eyebrow text-steel">papel: {etapa.papel}</p>
            <div className="flex flex-col gap-2">
              {leadsDaEtapa.map((lead) => (
                <div key={lead.id} className="border border-line bg-surface2 p-2.5">
                  <p className="text-sm font-medium">@{lead.instagram_username}</p>
                  <select
                    className={selectCls}
                    value={etapa.id}
                    onChange={(e) => mover(lead.id, Number(e.target.value))}
                  >
                    {etapas.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nome}
                      </option>
                    ))}
                  </select>
                  <select
                    className={selectCls}
                    value={lead.responsavel_id ?? ""}
                    onChange={(e) => atribuir(lead.id, e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Sem responsável</option>
                    {colegas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
