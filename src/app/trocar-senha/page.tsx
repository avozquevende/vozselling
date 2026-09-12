import { redirect } from "next/navigation";
import { usuarioDaSessao } from "@/lib/auth";
import { TrocarSenhaForm } from "./form";

export const dynamic = "force-dynamic";

export default async function TrocarSenhaPage() {
  const usuario = await usuarioDaSessao();
  if (!usuario) redirect("/login");

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <span className="eyebrow text-accent">Primeiro acesso</span>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold mt-1 mb-2">
        Defina sua senha
      </h1>
      <p className="text-sm text-muted mb-6">
        A senha que você usou para entrar era provisória. Escolha uma nova, só sua, com pelo
        menos 8 caracteres.
      </p>
      <TrocarSenhaForm destino={usuario.papel === "admin" ? "/admin" : "/social"} />
    </div>
  );
}
