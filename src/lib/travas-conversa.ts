// Travas de conversa em código (spec do Dream Social real, seção "travas
// que existem e por quê"). O prompt já pede pra não negar ser IA, não fingir
// empatia e devolver quem está com raiva — mas depender só do modelo
// obedecer não segura em produção. Aqui a régua é determinística: regex, não
// pedido.

export type TipoTrava = "raiva" | "crise" | "desconfiou_robo" | null;

// Quem pede pra parar, ou está de saco cheio — entrega ao operador E
// desliga o piloto pra este lead até um humano religar.
const PADRAO_RAIVA =
  /para\s+de\s+(me\s+)?(mandar|encher)|me\s+deixa\s+em\s+paz|n[ãa]o\s+me\s+manda\s+mais|cansei\s+disso|isso\s+(é|e)\s+spam|vou\s+denunciar|vou\s+te?\s*bloquear|me\s+bloqueia|sai\s+daqui|para\s+de\s+me\s+perturbar|n[ãa]o\s+quero\s+mais\s+(falar|conversar)/i;

// Luto, doença grave, aperto financeiro sério — não é hora de vender nem de
// sondar. Entrega ao operador sem gerar mensagem nenhuma.
const PADRAO_CRISE =
  /faleceu|morreu|perdi\s+(o\s+|a\s+)?(meu|minha)\s+(pai|m[ãa]e|filho|filha|marido|esposa|av[oôó]|irm[ãa]o|irm[ãa])|est(ou|á)\s+(internad[oa]|hospitalizad[oa]|no\s+hospital)|tentativa\s+de\s+suic[íi]dio|n[ãa]o\s+tenho\s+dinheiro\s+pra\s+nada|perdi\s+(o\s+|meu\s+)?emprego|fui\s+demitid[oa]|em\s+depress[ãa]o|crise\s+de\s+p[âa]nico/i;

// Lead perguntou direto se é robô/automático. O prompt já instrui admitir
// (item de App Review da Meta) — mas sem sistema de áudio gravado pra esse
// momento (ver Dream Social real), a saída mais segura hoje é devolver ao
// operador em vez de deixar o LLM tentar contornar sozinho.
const PADRAO_ROBO =
  /(voc[eê]|vc|tu)\s+(é|e)\s+(um\s+)?(rob[oôó]|bot)|isso\s+(é|e)\s+autom[aá]tico|(é|e)\s+um\s+chatbot|programad[oa]\s+pra|resposta\s+autom[aá]tica|intelig[êe]ncia\s+artificial/i;

/** Avalia só a última mensagem do lead — a régua olha o gatilho mais recente, não o histórico inteiro. */
export function avaliarUltimaMensagem(texto: string): TipoTrava {
  if (PADRAO_RAIVA.test(texto)) return "raiva";
  if (PADRAO_CRISE.test(texto)) return "crise";
  if (PADRAO_ROBO.test(texto)) return "desconfiou_robo";
  return null;
}
