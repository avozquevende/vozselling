// Busca novas mensagens recebidas via Instagram Messaging API e grava em
// `mensagens`/`leads`. O disparo real de comentários automáticos não passa
// por aqui — vem do webhook (src/app/api/webhooks/instagram).

export interface MensagemRecebida {
  instagramUsername: string;
  texto: string;
  recebidaEm: string;
}

/**
 * Placeholder: sem credenciais reais de uma conta conectada não há o que
 * sincronizar. Quando a conta estiver conectada, isto chama a Graph API de
 * conversas e grava o que for novo, marcando `ultimo_falante = 'lead'` para
 * cada lead que respondeu — é o que alimenta a fila do piloto.
 */
export async function sincronizarNovasMensagens(workspaceId: number): Promise<number> {
  console.log(`[instagram-sync] workspace ${workspaceId}: sem conta conectada ainda`);
  return 0;
}
