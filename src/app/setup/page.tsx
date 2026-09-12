"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoCompact } from "@/app/components/logo";
import { BTN_PRIMARIO } from "@/app/components/classes-botao";

const inputCls =
  "w-full min-h-11 bg-surface2 border border-linestrong px-3 text-sm text-ink placeholder:text-steel focus:border-accent outline-none";

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
        <span className="eyebrow text-accent">Pronto</span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          Acesso criado.
        </h1>
        <p className="text-sm text-muted">
          Agora entre com o email e a senha que você acabou de definir.
        </p>
        <button onClick={() => router.push("/login")} className={BTN_PRIMARIO}>
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-8">
        <LogoCompact />
      </div>
      <span className="eyebrow text-accent">Configuração inicial</span>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold mt-1 mb-2">
        Criar acesso admin
      </h1>
      <p className="mb-6 text-sm text-muted">
        O segredo abaixo é o mesmo valor de <code className="text-accentink">CRON_SECRET</code>{" "}
        configurado nas variáveis de ambiente do Vercel — sem ele, ninguém consegue criar login
        por aqui.
      </p>
      <form onSubmit={criar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">CRON_SECRET</span>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">Seu nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted">Senha (a que você vai usar pra entrar)</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
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
          {enviando ? "Criando…" : "Criar acesso"}
        </button>
      </form>
    </div>
  );
}
