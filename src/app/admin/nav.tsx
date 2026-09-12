"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Columns3,
  ListOrdered,
  MessagesSquare,
  RotateCcw,
  Users,
  KeyRound,
  BookOpen,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { UserChip } from "../user-chip";
import { LogoCompact } from "../components/logo";

type Item = { href: string; label: string; icon: React.ReactNode; exact?: boolean };
type Group = { title: string | null; items: Item[] };

const ICO = { size: 16, strokeWidth: 1.75 } as const;

const GROUPS: Group[] = [
  {
    title: null,
    items: [{ href: "/admin", label: "Painel", icon: <LayoutDashboard {...ICO} />, exact: true }],
  },
  {
    title: "Dream Social",
    items: [
      { href: "/admin/pipeline", label: "Pipeline", icon: <Columns3 {...ICO} /> },
      { href: "/admin/ranking", label: "Ranking", icon: <ListOrdered {...ICO} /> },
      { href: "/admin/direct", label: "Direct", icon: <MessagesSquare {...ICO} /> },
      { href: "/admin/retomada", label: "Retomada", icon: <RotateCcw {...ICO} /> },
    ],
  },
  {
    title: "Empresa",
    items: [
      { href: "/admin/workspaces", label: "Clientes", icon: <Users {...ICO} /> },
      { href: "/admin/usuarios", label: "Acessos", icon: <KeyRound {...ICO} /> },
      { href: "/admin/metodologia", label: "Metodologia", icon: <BookOpen {...ICO} /> },
    ],
  },
];

const CHEVRON_UP = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9.75 8 5.75l4 4" />
  </svg>
);

const MENU_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
  </svg>
);

const CLOSE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
  </svg>
);

function NavGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: Group;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      {group.title && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-full flex items-center justify-between px-3 min-h-11 eyebrow text-accent hover:text-accentink"
        >
          {group.title}
          <span className={`transition-transform motion-reduce:transition-none ${open ? "" : "rotate-180"}`}>
            {CHEVRON_UP}
          </span>
        </button>
      )}
      {open && (
        <div className={`flex flex-col gap-0.5 ${group.title ? "border-l border-line ml-3 pl-1.5" : ""}`}>
          {group.items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 min-h-11 text-sm rounded-lg transition-colors motion-reduce:transition-none ${
                  active ? "bg-surface2 text-accentink font-semibold" : "text-muted hover:text-ink hover:bg-surface2/60"
                }`}
              >
                <span className={active ? "text-accent" : "text-steel"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Nav({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col px-3 py-4">
      {GROUPS.map((g, i) => (
        <NavGroup key={i} group={g} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

/** Cabeçalho + drawer de navegação, visível só abaixo de md (768px). */
export function MobileNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 px-2 border-b border-linestrong bg-surface/90 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu de navegação"
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition-colors motion-reduce:transition-none"
        >
          {MENU_ICON}
        </button>
        <Link href="/admin" className="min-h-11 flex items-center">
          <LogoCompact />
        </Link>
      </header>

      <div id="admin-drawer" className={`md:hidden fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} inert={!open}>
        <div
          onClick={close}
          aria-hidden="true"
          className={`absolute inset-0 bg-bg/80 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navegação do painel"
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col overflow-y-auto border-r border-linestrong bg-surface transition-transform duration-200 motion-reduce:transition-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between gap-2 px-5 pt-4 pb-4 border-b border-line">
            <Link href="/admin" onClick={close} className="block py-1">
              <LogoCompact />
              <div className="font-[family-name:var(--font-display)] font-extrabold text-xs leading-tight mt-2 text-muted tracking-wide">
                Painel Admin
              </div>
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Fechar menu de navegação"
              className="min-h-11 min-w-11 -mr-2 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition-colors motion-reduce:transition-none"
            >
              {CLOSE_ICON}
            </button>
          </div>
          <Nav onNavigate={close} />
          <div className="mt-auto">
            <UserChip email={email} subtitle="Admin" />
          </div>
        </div>
      </div>
    </>
  );
}
