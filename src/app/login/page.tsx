"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoCompact } from "@/app/components/logo";
import { BTN_PRIMARIO } from "@/app/components/classes-botao";

const inputCls =
  "w-full min-h-11 bg-surface2 border border-linestrong px-3 text-sm text-ink placeholder:text-steel focus:border-accent outline-none";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (!resp.ok) {
        const { erro } = (await resp.json()) as { erro?: string };
        setErro(erro ?? "Não foi possível entrar.");
        return;
      }
      const usuario = (await resp.json()) as { papel: string; mustChangePassword: boolean };
      if (usuario.mustChangePassword) {
        router.push("/trocar-senha");
      } else {
        router.push(usuario.papel === "admin" ? "/admin" : "/social");
      }
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-8">
        <LogoCompact />
      </div>
      <span className="eyebrow text-accent">Entrar</span>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold mt-1 mb-6">
        Voz Selling
      </h1>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">E-mail</span>
          <input
            type="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">Senha</span>
          <input
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        {erro && (
          <p role="alert" className="text-sm text-danger">
            {erro}
          </p>
        )}
        <button type="submit" disabled={enviando} className={`${BTN_PRIMARIO} mt-2`}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
