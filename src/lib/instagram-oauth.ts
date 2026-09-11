// Conectar a conta do Instagram do cliente (Instagram Login, API oficial).
// Token dura ~60 dias e renova sozinho (handoff, seção 08).

export class IntegracaoIndisponivelError extends Error {
  constructor(nome: string) {
    super(`${nome} sem credenciais configuradas (ver .env.example).`);
  }
}

function exigirCredenciaisMeta(): { appId: string; appSecret: string; redirectUri: string } {
  const appId = process.env.IG_APP_ID;
  const appSecret = process.env.IG_APP_SECRET;
  const redirectUri = process.env.IG_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) {
    throw new IntegracaoIndisponivelError("Instagram/Meta (IG_APP_ID, IG_APP_SECRET, IG_REDIRECT_URI)");
  }
  return { appId, appSecret, redirectUri };
}

export function gerarUrlAutorizacao(state: string): string {
  const { appId, redirectUri } = exigirCredenciaisMeta();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments",
    response_type: "code",
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export interface TokenDeLongaDuracao {
  accessToken: string;
  instagramUserId: string;
  expiraEm: Date;
}

export async function trocarCodigoPorToken(code: string): Promise<TokenDeLongaDuracao> {
  const { appId, appSecret, redirectUri } = exigirCredenciaisMeta();

  const respostaCurta = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  if (!respostaCurta.ok) {
    throw new Error(`Falha ao trocar código por token: ${respostaCurta.status}`);
  }
  const curto = (await respostaCurta.json()) as { access_token: string; user_id: string };

  const urlLonga = new URL("https://graph.instagram.com/access_token");
  urlLonga.searchParams.set("grant_type", "ig_exchange_token");
  urlLonga.searchParams.set("client_secret", appSecret);
  urlLonga.searchParams.set("access_token", curto.access_token);

  const respostaLonga = await fetch(urlLonga);
  if (!respostaLonga.ok) {
    throw new Error(`Falha ao trocar por token de longa duração: ${respostaLonga.status}`);
  }
  const longo = (await respostaLonga.json()) as { access_token: string; expires_in: number };

  return {
    accessToken: longo.access_token,
    instagramUserId: curto.user_id,
    expiraEm: new Date(Date.now() + longo.expires_in * 1000),
  };
}
