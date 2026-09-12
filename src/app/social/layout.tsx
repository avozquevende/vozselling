import { redirect } from "next/navigation";
import Link from "next/link";
import { usuarioDaSessao } from "@/lib/auth";
import { LogoCompact } from "@/app/components/logo";

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
  if (usuario.must_change_password) redirect("/trocar-senha");
  if (!usuario.workspace_id) {
    // Admin sem workspace selecionado gerencia pelo /admin, não pelo /social.
    redirect(usuario.papel === "admin" ? "/admin" : "/login");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <LogoCompact />
        <p className="eyebrow text-muted">{usuario.nome}</p>
      </header>
      <nav className="flex flex-wrap gap-1 border-b border-line pb-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="min-h-11 flex items-center rounded-lg px-3 text-sm font-medium text-muted hover:text-ink hover:bg-surface2/60 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
