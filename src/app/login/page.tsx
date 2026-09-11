"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      const usuario = (await resp.json()) as { papel: string };
      router.push(usuario.papel === "admin" ? "/admin" : "/social");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-semibold">Entrar no Voz Selling</h1>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        />
        {erro && <p style={{ color: "var(--color-erro)" }}>{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md px-3 py-2 font-medium disabled:opacity-50"
          style={{ background: "var(--color-marca)", color: "white" }}
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
