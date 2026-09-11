import { usuarioDaSessao } from "@/lib/auth";
import { Direct } from "@/app/admin/dr/Direct";

export default async function DirectPage() {
  const usuario = await usuarioDaSessao();
  return <Direct workspaceId={usuario!.workspace_id!} />;
}
