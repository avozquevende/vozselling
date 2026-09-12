import { Direct } from "@/app/admin/dr/Direct";

export default function AdminDirectPage() {
  return (
    <div>
      <header className="mb-6">
        <span className="eyebrow text-accent">Admin · Todos os clientes</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          Direct
        </h1>
        <p className="text-muted text-sm mt-2 max-w-xl">
          Em aberto = o lead falou por último e a janela de 24h ainda está de pé.
        </p>
      </header>
      <Direct />
    </div>
  );
}
