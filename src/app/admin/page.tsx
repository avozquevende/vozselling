import { getDb } from "@/lib/db";

export default async function AdminHomePage() {
  const db = await getDb();
  const { total: totalWorkspaces } = (await db
    .prepare("SELECT COUNT(*) AS total FROM workspaces")
    .get()) as { total: number };
  const { total: totalLeads } = (await db.prepare("SELECT COUNT(*) AS total FROM leads").get()) as {
    total: number;
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
          Workspaces
        </p>
        <p className="text-2xl font-semibold">{totalWorkspaces}</p>
      </div>
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--color-borda)", background: "var(--color-superficie)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-texto-fraco)" }}>
          Leads no total
        </p>
        <p className="text-2xl font-semibold">{totalLeads}</p>
      </div>
    </div>
  );
}
