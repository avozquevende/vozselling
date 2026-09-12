import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AcessosPanel, type UsuarioLinha, type WorkspaceOpcao } from "./panel";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const admin = await requireAdmin();
  const db = await getDb();

  const usuarios = await db
    .prepare(
      `SELECT u.id, u.email, u.nome, u.papel, u.workspace_id, u.must_change_password, u.criado_em,
              w.nome AS workspace_nome,
              (SELECT COUNT(*) FROM sessoes s WHERE s.usuario_id = u.id) AS sessoes
         FROM usuarios u
         LEFT JOIN workspaces w ON w.id = u.workspace_id
        ORDER BY u.papel, u.email`,
    )
    .all<UsuarioLinha>();

  const workspaces = await db
    .prepare("SELECT id, nome FROM workspaces ORDER BY nome")
    .all<WorkspaceOpcao>();

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <span className="eyebrow text-accent">Admin · Quem entra na ferramenta</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mt-1">
          Acessos
        </h1>
        <p className="text-muted text-sm mt-2 max-w-xl">
          Cada acesso é um login. Operador enxerga só o workspace dele; admin enxerga tudo. A
          senha aparece uma vez na tela, no momento em que é criada — anote e mande para a
          pessoa.
        </p>
      </header>
      <AcessosPanel usuarios={usuarios} workspaces={workspaces} meuId={admin.id} />
    </div>
  );
}
