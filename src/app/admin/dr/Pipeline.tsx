"use client";

import { useEffect, useState } from "react";
import type { EtapaPainel, LeadPainel } from "./tipos";

interface Colega {
  id: number;
  nome: string;
}

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

  if (carregando) return <p className="text-texto-fraco">Carregando Pipeline…</p>;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {etapas.map((etapa) => {
        const leadsDaEtapa = leads.filter((l) => l.etapa_id === etapa.id);
        return (
          <div
            key={etapa.id}
            className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-3"
            style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{etapa.nome}</p>
              <span className="text-xs" style={{ color: "var(--color-texto-fraco)" }}>
                {leadsDaEtapa.length}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-texto-fraco)" }}>
              papel: {etapa.papel}
            </p>
            <div className="flex flex-col gap-2">
              {leadsDaEtapa.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-md border p-2"
                  style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie-alta)" }}
                >
                  <p className="text-sm font-medium">@{lead.instagram_username}</p>
                  <select
                    className="mt-2 w-full rounded border bg-transparent p-1 text-xs"
                    style={{ borderColor: "var(--color-borda)" }}
                    value={etapa.id}
                    onChange={(e) => mover(lead.id, Number(e.target.value))}
                  >
                    {etapas.map((op) => (
                      <option key={op.id} value={op.id} style={{ color: "black" }}>
                        {op.nome}
                      </option>
                    ))}
                  </select>
                  <select
                    className="mt-1 w-full rounded border bg-transparent p-1 text-xs"
                    style={{ borderColor: "var(--color-borda)" }}
                    value={lead.responsavel_id ?? ""}
                    onChange={(e) => atribuir(lead.id, e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="" style={{ color: "black" }}>
                      Sem responsável
                    </option>
                    {colegas.map((c) => (
                      <option key={c.id} value={c.id} style={{ color: "black" }}>
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
