import type { Papel } from "@/lib/papeis";

// Tipos compartilhados pelos componentes "dr" — usados tanto pelo painel do
// cliente (/social) quanto pelo admin. É a mesma implementação, duas peles
// (handoff, seção 05): mexer aqui muda os dois.
export interface LeadPainel {
  id: number;
  instagram_username: string;
  nome: string | null;
  nota: number | null;
  motivo_parada: string | null;
  mensagens_robo_count: number;
  ultimo_falante: "lead" | "robo" | "operador" | null;
  atualizado_em: string;
  etapa_id: number | null;
  etapa_nome: string | null;
  etapa_papel: Papel | null;
}

export interface EtapaPainel {
  id: number;
  workspace_id: number;
  nome: string;
  papel: Papel;
  ordem: number;
}

export interface ItemRetomadaPainel {
  id: number;
  lead_id: number;
  escada: string;
  passo: number;
  proximo_toque_em: string;
}
