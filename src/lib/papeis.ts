// Comportamento nunca depende do NOME da etapa — sempre do papel que ela
// declara. Etapas são customizáveis pelo cliente (renomeia, cria, reordena);
// a regra abaixo é a única verdade sobre "a IA age aqui?". Ler o label em
// vez do papel já escondeu conversas inteiras em produção (handoff, seção 9).

export type Papel = "fila" | "prepara" | "conduz" | "encerra" | "nutre";

export const PAPEIS: readonly Papel[] = [
  "fila",
  "prepara",
  "conduz",
  "encerra",
  "nutre",
] as const;

interface DescricaoPapel {
  papel: Papel;
  roboFala: boolean;
  descricao: string;
}

const DESCRICOES: Record<Papel, DescricaoPapel> = {
  fila: {
    papel: "fila",
    roboFala: false,
    descricao: "Fora do pipeline (fila do Ranking). A IA não fala.",
  },
  prepara: {
    papel: "prepara",
    roboFala: false,
    descricao: "Entrou, conversa não começou. A IA não puxa assunto.",
  },
  conduz: {
    papel: "conduz",
    roboFala: true,
    descricao: "A IA responde sozinha dentro da janela de 24h.",
  },
  encerra: {
    papel: "encerra",
    roboFala: false,
    descricao: "Saiu das mãos do robô. Quem fala é o operador.",
  },
  nutre: {
    papel: "nutre",
    roboFala: false,
    descricao: "Presença de longo prazo, sem cobrança.",
  },
};

export function descricaoDoPapel(papel: Papel): DescricaoPapel {
  return DESCRICOES[papel];
}

/** A única pergunta que o código deve fazer antes de deixar o robô escrever. */
export function roboPodeFalar(papel: Papel): boolean {
  return DESCRICOES[papel].roboFala;
}

export function ehPapelValido(valor: string): valor is Papel {
  return (PAPEIS as readonly string[]).includes(valor);
}
