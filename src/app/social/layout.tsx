import { redirect } from "next/navigation";
import Link from "next/link";
import { usuarioDaSessao } from "@/lib/auth";

const LINKS = [
  { href: "/social", label: "Direct" },
  { href: "/social/ranking", label: "Ranking" },
  { href: "/social/pipeline", label: "Pipeline" },
  { href: "/social/retomada", label: "Retomada" },
  { href: "/social/carreira", label: "Carreira" },
];

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioDaSessao();
  if (!usuario) redirect("/login");
  if (!usuario.workspace_id) {
    // Admin sem workspace selecionado gerencia pelo /admin, não pelo /social.
    redirect(usuario.papel === "admin" ? "/admin" : "/login");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <p className="text-lg font-semibold">Voz Selling</p>
        <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
          {usuario.nome}
        </p>
      </header>
      <nav
        className="flex gap-1 border-b pb-2"
        style={{ borderColor: "var(--color-borda)" }}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ color: "var(--color-texto)" }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
