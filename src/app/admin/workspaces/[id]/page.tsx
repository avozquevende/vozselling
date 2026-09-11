import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import { Ranking } from "@/app/admin/dr/Ranking";
import { Pipeline } from "@/app/admin/dr/Pipeline";

// Mesma implementação usada em /social/ranking e /social/pipeline — mexer
// nesses componentes muda as duas telas (handoff, seção 05).
export default async function WorkspaceDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = Number(id);

  const workspace = getDb()
    .prepare("SELECT id, nome FROM workspaces WHERE id = ?")
    .get(workspaceId) as { id: number; nome: string } | undefined;
  if (!workspace) notFound();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">{workspace.nome}</h1>
      <section>
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--color-texto-fraco)" }}>
          Ranking
        </h2>
        <Ranking workspaceId={workspace.id} />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--color-texto-fraco)" }}>
          Pipeline
        </h2>
        <Pipeline workspaceId={workspace.id} />
      </section>
    </div>
  );
}
