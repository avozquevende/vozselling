"use client";

import { useEffect, useState } from "react";
import type { EtapaPainel, LeadPainel } from "./tipos";

// A nota é a única coisa do produto que muda de cor por categoria — todo o
// resto usa a linguagem de estado (ok/atenção/erro). Ver spec, seção 03.
function corDaNota(nota: number | null): string {
  if (nota === null) return "var(--color-texto-fraco)";
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

  if (carregando) return <p className="text-texto-fraco">Carregando Ranking…</p>;
  if (erro) return <p style={{ color: "var(--color-erro)" }}>{erro}</p>;

  return (
    <div className="flex flex-col gap-2">
      {naFila.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
          Ninguém na fila do Ranking ainda.
        </p>
      )}
      {naFila.map((lead) => (
        <div
          key={lead.id}
          className="flex items-center justify-between rounded-lg border px-4 py-3"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
              style={{ background: corDaNota(lead.nota), color: "#0b0d10" }}
            >
              {lead.nota ?? "–"}
            </span>
            <div>
              <p className="font-medium">@{lead.instagram_username}</p>
              {lead.nome && (
                <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
                  {lead.nome}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => ativarLead(lead.id)}
            className="rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ background: "var(--color-marca)", color: "white" }}
          >
            Ativar
          </button>
        </div>
      ))}
    </div>
  );
}
