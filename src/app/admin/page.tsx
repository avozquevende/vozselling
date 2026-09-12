import { getDb } from "@/lib/db";

export default async function AdminHomePage() {
  const db = await getDb();
  const { total: totalWorkspaces } = (await db
    .prepare("SELECT COUNT(*) AS total FROM workspaces")
    .get()) as { total: number };
  const { total: totalLeads } = (await db.prepare("SELECT COUNT(*) AS total FROM leads").get()) as {
    total: number;
  };
  const { total: totalUsuarios } = (await db
    .prepare("SELECT COUNT(*) AS total FROM usuarios")
    .get()) as { total: number };

  return (
    <div>
      <header className="mb-6">
        <span className="eyebrow text-accent">Admin · Visão geral</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          Painel
        </h1>
      </header>
      <div className="grid sm:grid-cols-3 gap-4 max-w-3xl">
        <div className="border border-linestrong bg-surface p-5">
          <p className="eyebrow text-muted">Workspaces</p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
            {totalWorkspaces}
          </p>
        </div>
        <div className="border border-linestrong bg-surface p-5">
          <p className="eyebrow text-muted">Leads no total</p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
            {totalLeads}
          </p>
        </div>
        <div className="border border-linestrong bg-surface p-5">
          <p className="eyebrow text-muted">Acessos</p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
            {totalUsuarios}
          </p>
        </div>
      </div>
    </div>
  );
}
