"use client";

import { useEffect, useState } from "react";

interface DescricaoNivel {
  nivel: string;
  titulo: string;
  descricao: string;
  proximoPasso: string;
}

interface Metricas {
  abordagens: number;
  sessoesAgendadas: number;
  respostaPct: number;
  tempoRespostaHoras: number | null;
}

interface Metas {
  abordagensMin: number;
  abordagensMax: number;
  sessoesMin: number;
  sessoesMax: number;
  respostaPctMin: number;
  tempoRespostaHorasMax: number;
}

interface EventoNivel {
  id: number;
  nivel_anterior: string;
  nivel_novo: string;
  observacao: string;
  criado_em: string;
}

interface DadosCarreira {
  nivel: string;
  descricao: DescricaoNivel;
  proximoNivel: DescricaoNivel | null;
  metricas: Metricas;
  metas: Metas;
  sinalizacao: { pronto: boolean; motivos: string[] };
  historico: EventoNivel[];
}

const NIVEIS = ["executor", "interprete", "gestor", "expert"];

function linhaStyle() {
  return { borderColor: "var(--color-borda)", background: "var(--color-superficie)" };
}

// Mesma implementação em /social/carreira (própria visão, sem editar) e no
// admin (visão de qualquer operador, com poder de promover/rebaixar).
export function Carreira({ endpoint, podeEditar }: { endpoint: string; podeEditar: boolean }) {
  const [dados, setDados] = useState<DadosCarreira | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [novoNivel, setNovoNivel] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const resp = await fetch(endpoint);
    const json = (await resp.json()) as DadosCarreira;
    setDados(json);
    setNovoNivel(json.proximoNivel?.nivel ?? json.nivel);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function definirNivel(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel: novoNivel, observacao }),
      });
      setObservacao("");
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  if (carregando || !dados) return <p className="text-texto-fraco">Carregando carreira…</p>;

  const { descricao, proximoNivel, metricas, metas, sinalizacao, historico } = dados;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-4" style={linhaStyle()}>
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-texto-fraco)" }}>
          Nível atual
        </p>
        <p className="text-lg font-semibold">{descricao.titulo}</p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-texto-fraco)" }}>
          {descricao.descricao}
        </p>
        {proximoNivel && (
          <p className="mt-2 text-sm">
            <span className="font-medium">Próximo passo:</span> {descricao.proximoPasso}
          </p>
        )}
      </div>

      <div className="rounded-lg border p-4" style={linhaStyle()}>
        <p className="mb-2 text-xs uppercase tracking-wide" style={{ color: "var(--color-texto-fraco)" }}>
          Métricas dos últimos 7 dias (metas de referência do método)
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="font-semibold">{metricas.abordagens}</p>
            <p style={{ color: "var(--color-texto-fraco)" }}>
              Abordagens (meta {metas.abordagensMin}-{metas.abordagensMax})
            </p>
          </div>
          <div>
            <p className="font-semibold">{metricas.sessoesAgendadas}</p>
            <p style={{ color: "var(--color-texto-fraco)" }}>
              Sessões (meta {metas.sessoesMin}-{metas.sessoesMax})
            </p>
          </div>
          <div>
            <p className="font-semibold">{metricas.respostaPct}%</p>
            <p style={{ color: "var(--color-texto-fraco)" }}>Resposta (meta ≥{metas.respostaPctMin}%)</p>
          </div>
          <div>
            <p className="font-semibold">
              {metricas.tempoRespostaHoras === null ? "—" : `${metricas.tempoRespostaHoras}h`}
            </p>
            <p style={{ color: "var(--color-texto-fraco)" }}>Tempo resposta (meta ≤{metas.tempoRespostaHorasMax}h)</p>
          </div>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--color-texto-fraco)" }}>
          Só conta o que estiver atribuído a você em leads (campo &quot;responsável&quot; no Pipeline). Sem lead
          atribuído, as métricas ficam zeradas.
        </p>
      </div>

      <div
        className="rounded-lg border p-4"
        style={{
          borderColor: sinalizacao.pronto ? "var(--color-ok)" : "var(--color-borda)",
          background: "var(--color-superficie)",
        }}
      >
        {sinalizacao.pronto ? (
          <p className="text-sm" style={{ color: "var(--color-ok)" }}>
            Métricas bateram a meta do método esta semana — vale conversar sobre o próximo nível.
          </p>
        ) : (
          <div className="text-sm">
            <p className="mb-1 font-medium">Ainda não bate a meta pra sinalizar promoção:</p>
            <ul className="list-inside list-disc" style={{ color: "var(--color-texto-fraco)" }}>
              {sinalizacao.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {podeEditar && (
        <form onSubmit={definirNivel} className="flex flex-col gap-2 rounded-lg border p-4" style={linhaStyle()}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-texto-fraco)" }}>
            Definir nível (ação do admin — nunca automática)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={novoNivel}
              onChange={(e) => setNovoNivel(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={linhaStyle()}
            >
              {NIVEIS.map((n) => (
                <option key={n} value={n} style={{ color: "black" }}>
                  {n}
                </option>
              ))}
            </select>
            <input
              placeholder="Observação (opcional)"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm"
              style={linhaStyle()}
            />
            <button
              type="submit"
              disabled={salvando}
              className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--color-marca)", color: "white" }}
            >
              {salvando ? "Salvando…" : "Confirmar nível"}
            </button>
          </div>
        </form>
      )}

      {historico.length > 0 && (
        <div className="rounded-lg border p-4" style={linhaStyle()}>
          <p className="mb-2 text-xs uppercase tracking-wide" style={{ color: "var(--color-texto-fraco)" }}>
            Histórico
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {historico.map((h) => (
              <li key={h.id} style={{ color: "var(--color-texto-fraco)" }}>
                {h.criado_em} — {h.nivel_anterior} → {h.nivel_novo}
                {h.observacao ? ` (${h.observacao})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
