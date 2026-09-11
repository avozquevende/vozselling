// Módulo Dream Pickup: alimenta o Ranking com perfis via raspagem (Apify).
// Fora do núcleo oficial de propósito — não é API do Instagram, não entra
// na revisão da Meta. O Ranking também pontua sem isto, só pela mensagem
// que a pessoa mandou (ver agent-a1.ts).

export interface PerfilRaspado {
  username: string;
  bio: string;
  seguidores: number;
  postsRecentesResumo: string;
}

export async function buscarPerfilViaApify(username: string): Promise<PerfilRaspado> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error("APIFY_TOKEN não configurado — raspagem indisponível (ver .env.example).");
  }

  const resposta = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username] }),
    },
  );
  if (!resposta.ok) {
    throw new Error(`Apify recusou a raspagem de @${username}: ${resposta.status}`);
  }

  const itens = (await resposta.json()) as Array<{
    username: string;
    biography?: string;
    followersCount?: number;
    latestPosts?: Array<{ caption?: string }>;
  }>;
  const perfil = itens[0];
  if (!perfil) {
    throw new Error(`Perfil @${username} não encontrado pela raspagem.`);
  }

  return {
    username: perfil.username,
    bio: perfil.biography ?? "",
    seguidores: perfil.followersCount ?? 0,
    postsRecentesResumo: (perfil.latestPosts ?? [])
      .map((p) => p.caption)
      .filter(Boolean)
      .slice(0, 5)
      .join(" | "),
  };
}
