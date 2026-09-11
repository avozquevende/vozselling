// Camada de IA. Troca de provedor é só variável de ambiente — nenhum agente
// (agent-a1, agent-piloto, agent-retomada) fala com OpenAI/Anthropic/Gemini
// diretamente, todos passam por aqui.

export type Provedor = "openai" | "anthropic" | "gemini";

export class LlmIndisponivelError extends Error {
  constructor(provedor: Provedor) {
    super(
      `Provedor de IA "${provedor}" sem chave configurada. Defina a variável de ambiente correspondente (ver .env.example).`,
    );
  }
}

export function provedorAtivo(): Provedor {
  const escolhido = process.env.LLM_PROVIDER as Provedor | undefined;
  if (escolhido) return escolhido;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "openai";
}

function chaveDoProvedor(provedor: Provedor): string | undefined {
  switch (provedor) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY;
  }
}

export interface GerarTextoParams {
  modelo: string;
  sistema: string;
  prompt: string;
  temperatura?: number;
}

// Cache simples em memória por processo — evita reanalisar o mesmo perfil
// duas vezes na mesma vida do servidor. Não é persistente, não precisa ser.
const cachePrompt = new Map<string, string>();
const CACHE_MAX = 500;

function chaveCache(provedor: Provedor, params: GerarTextoParams): string {
  return `${provedor}:${params.modelo}:${params.sistema}:${params.prompt}`;
}

async function chamarOpenAI(chave: string, params: GerarTextoParams): Promise<string> {
  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: params.modelo,
      temperature: params.temperatura ?? 0.7,
      messages: [
        { role: "system", content: params.sistema },
        { role: "user", content: params.prompt },
      ],
    }),
  });
  if (!resposta.ok) {
    throw new Error(`OpenAI respondeu ${resposta.status}: ${await resposta.text()}`);
  }
  const json = (await resposta.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message.content ?? "";
}

async function chamarAnthropic(chave: string, params: GerarTextoParams): Promise<string> {
  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": chave,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.modelo,
      max_tokens: 1024,
      temperature: params.temperatura ?? 0.7,
      system: params.sistema,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Anthropic respondeu ${resposta.status}: ${await resposta.text()}`);
  }
  const json = (await resposta.json()) as { content: Array<{ text: string }> };
  return json.content[0]?.text ?? "";
}

async function chamarGemini(chave: string, params: GerarTextoParams): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.modelo}:generateContent?key=${chave}`;
  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.sistema }] },
      contents: [{ parts: [{ text: params.prompt }] }],
      generationConfig: { temperature: params.temperatura ?? 0.7 },
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Gemini respondeu ${resposta.status}: ${await resposta.text()}`);
  }
  const json = (await resposta.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return json.candidates[0]?.content.parts[0]?.text ?? "";
}

async function chamarProvedor(provedor: Provedor, chave: string, params: GerarTextoParams) {
  switch (provedor) {
    case "openai":
      return chamarOpenAI(chave, params);
    case "anthropic":
      return chamarAnthropic(chave, params);
    case "gemini":
      return chamarGemini(chave, params);
  }
}

/** Gera texto com o provedor ativo. Uma retentativa em caso de falha de rede/5xx. */
export async function gerarTexto(params: GerarTextoParams): Promise<string> {
  const provedor = provedorAtivo();
  const chave = chaveDoProvedor(provedor);
  if (!chave) {
    throw new LlmIndisponivelError(provedor);
  }

  const cacheKey = chaveCache(provedor, params);
  const emCache = cachePrompt.get(cacheKey);
  if (emCache !== undefined) return emCache;

  let ultimoErro: unknown;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const texto = await chamarProvedor(provedor, chave, params);
      if (cachePrompt.size >= CACHE_MAX) {
        const primeiraChave = cachePrompt.keys().next().value;
        if (primeiraChave !== undefined) cachePrompt.delete(primeiraChave);
      }
      cachePrompt.set(cacheKey, texto);
      return texto;
    } catch (err) {
      ultimoErro = err;
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error(String(ultimoErro));
}
