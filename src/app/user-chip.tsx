"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Rodapé de identidade da barra lateral: quem está logado + sair. */
export function UserChip({ email, subtitle }: { email: string; subtitle: string }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState("");

  async function logout() {
    setSaindo(true);
    setErroSaida("");
    try {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      if (!r.ok) {
        setErroSaida("não consegui encerrar a sessão. tente de novo.");
        setSaindo(false);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setErroSaida("sem conexão. sua sessão continua aberta.");
      setSaindo(false);
    }
  }

  return (
    <div className="px-5 py-4 border-t border-line">
      <div className="eyebrow text-muted">{subtitle}</div>
      <div className="font-[family-name:var(--font-mono)] text-xs text-accentink mt-1 break-all">
        {email}
      </div>
      <button
        type="button"
        onClick={logout}
        disabled={saindo}
        className="mt-2 text-xs text-muted hover:text-ink underline underline-offset-2 disabled:opacity-60"
      >
        {saindo ? "Saindo…" : "Sair"}
      </button>
      {erroSaida && <p className="mt-1 text-xs text-danger">{erroSaida}</p>}
    </div>
  );
}
