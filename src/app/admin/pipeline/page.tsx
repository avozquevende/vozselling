import { PipelineGlobal } from "@/app/admin/dr/PipelineGlobal";

export default function AdminPipelinePage() {
  return (
    <div>
      <header className="mb-6">
        <span className="eyebrow text-accent">Admin · Todos os clientes</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          Pipeline
        </h1>
        <p className="text-muted text-sm mt-2 max-w-xl">
          Agrupado por papel — o único eixo comum entre clientes, já que cada um nomeia a
          própria etapa do jeito que quiser. Clica num lead pra abrir o workspace dele e mover
          de etapa.
        </p>
      </header>
      <PipelineGlobal />
    </div>
  );
}
