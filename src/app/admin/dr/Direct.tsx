"use client";

import { useEffect, useState } from "react";
import type { LeadPainel } from "./tipos";
import { BTN_PRIMARIO_MIUDO } from "@/app/components/classes-botao";

// Fila do piloto: leads em etapa "conduz" onde quem falou por último foi o
// lead — é a vez do robô responder, dentro da janela de 24h. workspaceId
// omitido = visão global do admin (todos os clientes juntos).
export function Direct({ workspaceId }: { workspaceId?: number }) {
  const [leads, setLeads] = useState<LeadPainel[]>([]);
  const [gerando, setGerando] = useState<number | null>(null);
  const [ultimaMensagem, setUltimaMensagem] = useState<{ leadId: number; texto: string } | null>(
    null,
  );
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const qs = workspaceId ? `?workspaceId=${workspaceId}` : "";
    const resp = await fetch(`/api/leads${qs}`);
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

  if (carregando) return <p className="text-sm text-muted">Carregando Direct…</p>;

  return (
    <div className="border border-linestrong bg-surface divide-y divide-line">
      {leads.length === 0 && <p className="px-5 py-4 text-sm text-muted">Nenhuma conversa esperando o robô agora.</p>}
      {leads.map((lead) => (
        <div key={lead.id} className="px-5 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-medium">
              @{lead.instagram_username}
              {lead.workspace_nome && <span className="ml-2 eyebrow text-accent">{lead.workspace_nome}</span>}
            </p>
            <button
              onClick={() => gerarResposta(lead.id)}
              disabled={gerando === lead.id}
              className={BTN_PRIMARIO_MIUDO}
            >
              {gerando === lead.id ? "Gerando…" : "Gerar resposta"}
            </button>
          </div>
          <p className="text-xs text-muted mt-0.5">{lead.mensagens_robo_count} mensagens do robô nesta conversa</p>
          {ultimaMensagem?.leadId === lead.id && (
            <p className="mt-2 border border-accent/40 bg-accent/5 p-2.5 text-sm">{ultimaMensagem.texto}</p>
          )}
        </div>
      ))}
    </div>
  );
}
