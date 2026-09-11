"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Cria o primeiro (ou próximo) acesso admin sem precisar de curl/terminal —
// equivalente visual do POST em /api/setup/bootstrap-admin. Exige o
// CRON_SECRET configurado no Vercel: só quem tem acesso ao painel de env
// vars consegue criar um login aqui (ver handoff, seção 08).
export default function SetupPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const resp = await fetch("/api/setup/bootstrap-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, nome, email, senha }),
      });
      if (!resp.ok) {
        const { erro } = (await resp.json()) as { erro?: string };
        setErro(erro ?? "Não foi possível criar o acesso.");
        return;
      }
      setSucesso(true);
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">Acesso criado.</h1>
        <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
          Agora entre com o email e a senha que você acabou de definir.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-md px-3 py-2 font-medium"
          style={{ background: "var(--color-marca)", color: "white" }}
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold">Criar acesso admin</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--color-texto-fraco)" }}>
        O segredo abaixo é o mesmo valor de <code>CRON_SECRET</code> configurado nas variáveis de
        ambiente do Vercel — sem ele, ninguém consegue criar login por aqui.
      </p>
      <form onSubmit={criar} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="CRON_SECRET"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        />
        <input
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
        />
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
          placeholder="Senha (a que você vai usar pra entrar)"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={8}
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
          {enviando ? "Criando…" : "Criar acesso"}
        </button>
      </form>
    </div>
  );
}
