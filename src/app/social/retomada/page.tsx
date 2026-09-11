import { usuarioDaSessao } from "@/lib/auth";
import { Retomada } from "@/app/admin/dr/Retomada";

export default async function RetomadaPage() {
  const usuario = await usuarioDaSessao();
  return <Retomada workspaceId={usuario!.workspace_id!} />;
}
