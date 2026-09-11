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
