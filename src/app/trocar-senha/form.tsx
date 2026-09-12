"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN_PRIMARIO } from "@/app/components/classes-botao";

const inputCls =
  "w-full min-h-11 bg-surface2 border border-linestrong px-3 text-sm text-ink placeholder:text-steel focus:border-accent outline-none";

export function TrocarSenhaForm({ destino }: { destino: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }
    setEnviando(true);
    try {
      const resp = await fetch("/api/auth/trocar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!resp.ok) {
        const { erro } = (await resp.json()) as { erro?: string };
        setErro(erro ?? "Não foi possível trocar a senha.");
        return;
      }
      router.push(destino);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="eyebrow text-muted">Nova senha</span>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={8}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="eyebrow text-muted">Confirme a senha</span>
        <input
          type="password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
          minLength={8}
          className={inputCls}
        />
      </label>
      {erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className={`${BTN_PRIMARIO} mt-2`}>
        {enviando ? "Salvando…" : "Salvar e entrar"}
      </button>
    </form>
  );
}
