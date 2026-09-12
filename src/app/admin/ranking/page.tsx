import { Ranking } from "@/app/admin/dr/Ranking";

export default function AdminRankingPage() {
  return (
    <div>
      <header className="mb-6">
        <span className="eyebrow text-accent">Admin · Todos os clientes</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          Ranking
        </h1>
        <p className="text-muted text-sm mt-2 max-w-xl">
          Prospecção, leitura e análise de perfil — a nota vem do ICP de cada workspace. É por
          aqui que a adição acontece: abre o perfil de verdade e consome o teto diário do
          cliente.
        </p>
      </header>
      <Ranking />
    </div>
  );
}
