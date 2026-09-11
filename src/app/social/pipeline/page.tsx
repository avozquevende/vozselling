import { usuarioDaSessao } from "@/lib/auth";
import { Pipeline } from "@/app/admin/dr/Pipeline";

export default async function PipelinePage() {
  const usuario = await usuarioDaSessao();
  return <Pipeline workspaceId={usuario!.workspace_id!} />;
}
