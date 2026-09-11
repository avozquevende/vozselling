// Enviar/ler via Instagram Messaging API (oficial). Toda escrita aqui é o
// que de fato sai para o Instagram — nada de raspagem neste arquivo (isso é
// o Dream Pickup, em garimpo.ts/buscar-perfil.ts, propositalmente à parte).

export async function enviarMensagemDireta(
  accessToken: string,
  instagramUserId: string,
  destinatarioId: string,
  texto: string,
): Promise<void> {
  const resposta = await fetch(`https://graph.instagram.com/v21.0/${instagramUserId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: destinatarioId },
      message: { text: texto },
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao enviar DM: ${resposta.status} ${await resposta.text()}`);
  }
}

/** O webhook manda o IGSID (sender.id), nunca o @username — resolve aqui. */
export async function buscarUsername(accessToken: string, igsid: string): Promise<string> {
  const url = new URL(`https://graph.instagram.com/v21.0/${igsid}`);
  url.searchParams.set("fields", "username");
  url.searchParams.set("access_token", accessToken);

  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Falha ao resolver username de ${igsid}: ${resposta.status}`);
  }
  const json = (await resposta.json()) as { username?: string };
  return json.username ?? igsid;
}

export async function responderComentario(
  accessToken: string,
  comentarioId: string,
  texto: string,
): Promise<void> {
  const resposta = await fetch(`https://graph.instagram.com/v21.0/${comentarioId}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message: texto }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao responder comentário: ${resposta.status} ${await resposta.text()}`);
  }
}
