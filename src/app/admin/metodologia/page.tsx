"use client";

import { useEffect, useState } from "react";

interface Secao {
  chave: string;
  titulo: string;
  conteudo: string;
  atualizado_em: string;
}

const campoStyle = {
  borderColor: "var(--color-borda)",
  background: "var(--color-superficie)",
};

function CardSecao({ secao, onSalvo }: { secao: Secao; onSalvo: (chave: string, conteudo: string) => void }) {
  const [texto, setTexto] = useState(secao.conteudo);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [aberto, setAberto] = useState(secao.conteudo.length > 0);

  async function salvar() {
    setSalvando(true);
    setSalvo(false);
    try {
      await fetch(`/api/admin/metodologia/${secao.chave}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo: texto }),
      });
      onSalvo(secao.chave, texto);
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
    >
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium">{secao.titulo}</span>
        <span className="text-xs" style={{ color: "var(--color-texto-fraco)" }}>
          {texto.length > 0 ? `${texto.length} caracteres` : "vazio"} · {aberto ? "recolher" : "expandir"}
        </span>
      </button>
      {aberto && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            placeholder="Cola aqui o conteúdo da aula/contexto do Filippe para esta seção…"
            className="w-full rounded-md border p-2 text-sm"
            style={campoStyle}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className="w-fit rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--color-marca)", color: "white" }}
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
            {salvo && (
              <span className="text-sm" style={{ color: "var(--color-ok)" }}>
                Salvo.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetodologiaPage() {
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const resp = await fetch("/api/admin/metodologia");
    const { secoes } = (await resp.json()) as { secoes: Secao[] };
    setSecoes(secoes);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  if (carregando) return <p className="text-texto-fraco">Carregando…</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
        Isto é o método — como o robô qualifica, conduz cada etapa e retoma quem
        sumiu. Cola aqui o conteúdo das aulas/contextos do Filippe, seção por
        seção. As regras estruturais (régua do relógio, faixas de nota) continuam
        fixas no código — isto é a voz e a tática por cima delas.
      </p>
      {secoes.map((secao) => (
        <CardSecao
          key={secao.chave}
          secao={secao}
          onSalvo={(chave, conteudo) =>
            setSecoes((atual) => atual.map((s) => (s.chave === chave ? { ...s, conteudo } : s)))
          }
        />
      ))}
    </div>
  );
}
