"use client";

import { useEffect, useState } from "react";
import { BTN_PRIMARIO_MIUDO } from "@/app/components/classes-botao";

interface Secao {
  chave: string;
  titulo: string;
  conteudo: string;
  atualizado_em: string;
}

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
    <div className="border border-linestrong bg-surface p-5">
      <button onClick={() => setAberto(!aberto)} className="flex w-full items-center justify-between text-left">
        <span className="font-medium text-sm">{secao.titulo}</span>
        <span className="eyebrow text-muted">
          {texto.length > 0 ? `${texto.length} caracteres` : "vazio"} · {aberto ? "recolher" : "expandir"}
        </span>
      </button>
      {aberto && (
        <div className="mt-4 flex flex-col gap-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            placeholder="Cola aqui o conteúdo da aula/contexto do Filippe para esta seção…"
            className="w-full bg-surface2 border border-linestrong px-3 py-2 text-sm text-ink placeholder:text-steel focus:border-accent outline-none"
          />
          <div className="flex items-center gap-3">
            <button onClick={salvar} disabled={salvando} className={BTN_PRIMARIO_MIUDO}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
            {salvo && <span className="text-sm text-ok">Salvo.</span>}
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

  if (carregando) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div>
      <header className="mb-6">
        <span className="eyebrow text-accent">Admin · Base de conhecimento</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          Metodologia
        </h1>
        <p className="text-muted text-sm mt-2 max-w-2xl">
          Isto é o método — como o robô qualifica, conduz cada etapa e retoma quem sumiu. Cola
          aqui o conteúdo das aulas/contextos do Filippe, seção por seção. As regras estruturais
          (régua do relógio, faixas de nota) continuam fixas no código — isto é a voz e a tática
          por cima delas.
        </p>
      </header>
      <div className="flex flex-col gap-3 max-w-3xl">
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
    </div>
  );
}
