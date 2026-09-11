import { usuarioDaSessao } from "@/lib/auth";
import { Ranking } from "@/app/admin/dr/Ranking";

export default async function RankingPage() {
  const usuario = await usuarioDaSessao();
  return <Ranking workspaceId={usuario!.workspace_id!} />;
}
