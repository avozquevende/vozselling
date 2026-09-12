"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeadPainel } from "./tipos";

// Visão de tudo, por papel — não por etapa (cada cliente nomeia a própria
// etapa diferente; papel é o único eixo comum entre workspaces). Sem o
// dropdown de mover: mover exige saber as etapas daquele workspace
// específico, então isso continua em /admin/workspaces/[id].
const COLUNAS: { papel: LeadPainel["etapa_papel"]; rotulo: string }[] = [
  { papel: "fila", rotulo: "Prospecção" },
  { papel: "prepara", rotulo: "Adição" },
  { papel: "conduz", rotulo: "Condução" },
  { papel: "encerra", rotulo: "Fechamento" },
  { papel: "nutre", rotulo: "Nutrição" },
];

export function PipelineGlobal() {
  const [leads, setLeads] = useState<LeadPainel[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      const resp = await fetch("/api/leads");
      const { leads } = (await resp.json()) as { leads: LeadPainel[] };
      setLeads(leads);
      setCarregando(false);
    })();
  }, []);

  if (carregando) return <p className="text-sm text-muted">Carregando Pipeline…</p>;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUNAS.map((coluna) => {
        const leadsDaColuna = leads.filter((l) => l.etapa_papel === coluna.papel);
        return (
          <div key={coluna.papel} className="flex w-64 shrink-0 flex-col gap-2 border border-linestrong bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{coluna.rotulo}</p>
              <span className="eyebrow text-muted">{leadsDaColuna.length}</span>
            </div>
            <p className="eyebrow text-steel">papel: {coluna.papel}</p>
            <div className="flex flex-col gap-2">
              {leadsDaColuna.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/workspaces/${lead.workspace_id}`}
                  className="block border border-line bg-surface2 p-2.5 hover:border-accent/60 transition-colors"
                >
                  <p className="text-sm font-medium">@{lead.instagram_username}</p>
                  {lead.workspace_nome && <p className="text-xs text-accentink mt-0.5">{lead.workspace_nome}</p>}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
