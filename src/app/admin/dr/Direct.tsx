"use client";

import { useEffect, useState } from "react";
import type { LeadPainel } from "./tipos";

// Fila do piloto: leads em etapa "conduz" onde quem falou por último foi o
// lead — é a vez do robô responder, dentro da janela de 24h.
export function Direct({ workspaceId }: { workspaceId: number }) {
  const [leads, setLeads] = useState<LeadPainel[]>([]);
  const [gerando, setGerando] = useState<number | null>(null);
  const [ultimaMensagem, setUltimaMensagem] = useState<{ leadId: number; texto: string } | null>(
    null,
  );
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const resp = await fetch(`/api/leads?workspaceId=${workspaceId}`);
    const { leads } = (await resp.json()) as { leads: LeadPainel[] };
    setLeads(leads.filter((l) => l.etapa_papel === "conduz" && l.ultimo_falante === "lead"));
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function gerarResposta(leadId: number) {
    setGerando(leadId);
    try {
      const resp = await fetch("/api/piloto/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const resultado = (await resp.json()) as { texto?: string };
      if (resultado.texto) setUltimaMensagem({ leadId, texto: resultado.texto });
      await carregar();
    } finally {
      setGerando(null);
    }
  }

  if (carregando) return <p className="text-texto-fraco">Carregando Direct…</p>;

  return (
    <div className="flex flex-col gap-3">
      {leads.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
          Nenhuma conversa esperando o robô agora.
        </p>
      )}
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="rounded-lg border px-4 py-3"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        >
          <div className="flex items-center justify-between">
            <p className="font-medium">@{lead.instagram_username}</p>
            <button
              onClick={() => gerarResposta(lead.id)}
              disabled={gerando === lead.id}
              className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--color-marca)", color: "white" }}
            >
              {gerando === lead.id ? "Gerando…" : "Gerar resposta"}
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--color-texto-fraco)" }}>
            {lead.mensagens_robo_count} mensagens do robô nesta conversa
          </p>
          {ultimaMensagem?.leadId === lead.id && (
            <p className="mt-2 rounded-md border p-2 text-sm" style={{ borderColor: "var(--color-marca)" }}>
              {ultimaMensagem.texto}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
