import { Retomada } from "@/app/admin/dr/Retomada";

export default function AdminRetomadaPage() {
  return (
    <div>
      <header className="mb-6">
        <span className="eyebrow text-accent">Admin · Todos os clientes</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          Retomada
        </h1>
        <p className="text-muted text-sm mt-2 max-w-xl">
          Follow-up de quem parou de responder — cada etapa tem a escada certa.
        </p>
      </header>
      <Retomada />
    </div>
  );
}
