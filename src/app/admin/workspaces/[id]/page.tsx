import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import { Ranking } from "@/app/admin/dr/Ranking";
import { Pipeline } from "@/app/admin/dr/Pipeline";
import { WorkspaceConfig } from "./Config";

// Mesma implementação usada em /social/ranking e /social/pipeline — mexer
// nesses componentes muda as duas telas (handoff, seção 05).
export default async function WorkspaceDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = Number(id);

  const db = await getDb();
  const workspace = (await db.prepare("SELECT id, nome FROM workspaces WHERE id = ?").get(workspaceId)) as
    | { id: number; nome: string }
    | undefined;
  if (!workspace) notFound();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <span className="eyebrow text-accent">Cliente</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          {workspace.nome}
        </h1>
      </header>
      <section>
        <h2 className="eyebrow text-steel mb-3">Ranking</h2>
        <Ranking workspaceId={workspace.id} />
      </section>
      <section>
        <h2 className="eyebrow text-steel mb-3">Pipeline</h2>
        <Pipeline workspaceId={workspace.id} />
      </section>
      <section>
        <h2 className="eyebrow text-steel mb-3">Configurações</h2>
        <WorkspaceConfig workspaceId={workspace.id} />
      </section>
    </div>
  );
}
