import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioDaSessao } from "@/lib/auth";
import { UserChip } from "../user-chip";
import { MobileNav, Nav } from "./nav";
import { LogoCompact } from "../components/logo";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioDaSessao();
  if (!usuario) redirect("/login");
  if (usuario.must_change_password) redirect("/trocar-senha");
  if (usuario.papel !== "admin") redirect("/social");

  return (
    <div className="flex min-h-screen">
      <MobileNav email={usuario.email} />
      <aside className="hidden md:flex w-60 shrink-0 border-r border-linestrong bg-surface/70 backdrop-blur-sm flex-col">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-line hover:bg-surface2/50 transition-colors rounded-lg mx-1"
        >
          <div className="flex-1">
            <LogoCompact />
            <div className="font-[family-name:var(--font-display)] font-extrabold text-xs leading-tight mt-2 text-muted tracking-wide">
              Painel Admin
            </div>
          </div>
        </Link>
        <Nav />
        <div className="mt-auto">
          <UserChip email={usuario.email} subtitle="Admin" />
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-4 pt-20 pb-8 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
