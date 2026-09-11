// Conteúdo inicial da metodologia, extraído das aulas do Filippe Neto (e do
// time Voz) no tldv — ver docs/handoff-tecnico.md para as fontes. Só entra
// no banco na primeira vez que a seção é criada (garantirSecoesPadrao em
// metodologia.ts); depois disso, quem manda é o que estiver salvo lá — este
// arquivo não sobrescreve edição feita pela tela /admin/metodologia.
export const SEED_METODOLOGIA: Record<string, string> = {
  tom_de_voz: `Fonte: Aula 09/06 — Estrutura de conversa que gera oportunidade (Filippe Neto).

A fórmula de conexão genuína, em 5 passos: Presença → Perguntas → Escutar → Contribuir → Mudar de nível. O contrário também é recíproco — quem quer subir de nível numa relação também precisa contribuir e estar presente primeiro.

"Conversas não custam apenas tempo, custam direção." Não é sobre quanto tempo uma conversa consome, é sobre para onde ela está levando — se não está levando a lugar nenhum, o problema não é o tempo gasto, é a falta de direção.

Ouvir de verdade importa mais do que parecer interessado: não tire conclusões rasas do que a pessoa está dizendo — realmente se interesse pelo assunto dela antes de pensar em como responder ou contribuir. Depois de ouvir, pergunte: de que forma eu posso contribuir com isso? Entregue uma percepção real, um insight — não um sermão, não uma palestra. Quem fala querendo ser o centro das atenções ("como se tivesse câmera filmando") não está gerando transformação, está performando.

Elogio como abertura de conversa: nunca elogie o físico — abre margem para interpretação errada (principalmente de homem para mulher). Elogie algo que você genuinamente pesquisou sobre a pessoa: a trajetória dela, uma conquista, uma escolha que ela fez. Desperta curiosidade sem soar interesseiro porque é específico e verdadeiro, não genérico. Esse princípio vale nos dois sentidos (homem↔mulher) — o que muda é o cuidado redobrado quando o elogio pode ser mal-interpretado.`,

  conexao: `Fonte: Aula 02/06 — Como abordar pessoas sem parecer interesseiro (Filippe Neto).

Técnica de abertura: nunca aborda com elogio genérico ("oi, tudo bem?", elogio de aparência). Pesquisa algo específico e verdadeiro que a pessoa fez ou postou, e comenta sobre isso de um jeito que só faz sentido se você realmente prestou atenção. Exemplo real usado na aula: "Caramba, essa imagem que você fez foi toda cuidada. Você viu que vai lançar agora [algo específico do nicho dela]?" — é específico, verificável, e não pede nada.

Teste de autenticidade: a pergunta que Filippe faz pra si mesmo antes de mandar é "qual a probabilidade dessa pessoa responder achando que eu vou vender alguma coisa, só de olhar meu perfil?" — se a abordagem falha nesse teste (parece feita pra vender), ela não é abertura de conexão, é abordagem disfarçada.

Volume sem expectativa de venda: manda mensagens (a aula fala em 30/dia) com interesse genuíno em conectar, não em vender. "Sem ter o interesse em vender, o cérebro te deixa mandar." Reformula o que pode dar errado: "ao final de 7 dias, o que de pior pode acontecer? Você tem um monte de amigo novo. O que de melhor pode acontecer? Pessoas vão precisar do que você carrega."

Entrada por prova social existente: procura pessoas que já têm alguma conexão orgânica com o seu nicho/marca (alguém que já comentou, já usa, já demonstrou interesse) antes de abordar do zero — "eu só tenho que navegar onde estão os peixinhos."

Não precisa fechar na primeira conversa: "você tem que querer ser lembrado" — o objetivo da conexão inicial não é vender ali, é ficar na cabeça da pessoa pro momento certo.`,

  conducao: `Fonte: Aula 02/06 — Como abordar pessoas sem parecer interesseiro (Filippe Neto).

A dor do lead sai sozinha quando a pergunta é genuína. Sequência usada ao vivo na aula (com um participante real, Matheus):
1. Elogio específico e verdadeiro sobre algo que a pessoa fez/disse.
2. Pergunta aberta sobre o objetivo dela ("você quer alcançar mais pessoas com isso?").
3. Pergunta sobre o que está travando ("hoje você tem algum ponto que não tá conectando com as pessoas?") — e a pessoa nomeia o próprio problema sozinha ("acho que preciso de mais intensidade no digital").
4. Confirma o valor de resolver aquilo, sem empurrar nada ("é mais fácil você ficar fazendo arte no Canva ou prospectando cliente pra alavancar financeiramente?" — "com certeza prospectando").

"Nesse ponto já vendi — ele já falou o problema dele, já falou a dor dele." A régua de condução não é sobre convencer, é sobre fazer as perguntas certas pra pessoa articular a própria dor e o próprio motivo pra agir. Interesse genuíno gera conexão; pergunta invasiva (ex: "quanto você fatura?" direto, sem contexto) gera defesa.

Nunca pule pra pergunta de faturamento/dinheiro sem antes ter estabelecido interesse genuíno na trajetória da pessoa — a ordem importa: primeiro a pessoa sente que você se importa com ela, só depois a conversa chega em números.`,

  convite: `Fonte: Aula bônus - social selling, 23/06 (Leandro Schlemper, time Voz).

Sequência real de convite usada pelo time (4 mensagens, cada uma só dispara se a anterior não fechou):
1. Convite direto e específico — não genérico. Ex: "Como tá sua agenda pro dia X? Vou ter [evento/oferta], queria te fazer um convite — vai ser muito relevante pra você."
2. Sem resposta → não repete a mesma mensagem. Comenta publicamente algo genuíno no conteúdo da pessoa ("que massa esse conteúdo, você tinha que estar lá") pra puxar ela de volta pro Direct sem soar repetitivo.
3. Detalhes de acesso/oferta, sempre com ancoragem de preço: mostra o valor cheio primeiro, depois o valor com desconto/condição especial ("o valor normal é X, mas vou liberar pra você por Y"). Nunca oferece de graça — mesmo um valor simbólico baixo ("a semente") gera comprometimento; "ninguém valoriza aquilo que é gratuito".
4. Manda o link/próximo passo concreto de fechamento.

Tags de status por lead (equivalente ao que o pipeline/retomada já fazem no sistema): sinalizado = demonstrou interesse; enviado = link mandado, aguardando pagamento/confirmação. Servem pra saber, olhando a lista, quem precisa de qual ação — não se perde ninguém no meio do caminho.

Ancoragem: sempre apresente o valor cheio antes do valor com desconto, mesmo em produtos maiores ("esse produto custa 180 mil, mas fechando hoje fica 18 mil"). Isso vale pra qualquer oferta, não só evento.

Objeção de preço: nunca caia direto pro valor mínimo. Primeiro sustenta o valor ("é o mínimo que cobre [o que está incluso]"), só cede se a pessoa insistir — e mesmo assim nunca de graça.

Nunca ofereça "mais alguém"/condição extra que a pessoa não pediu: cada objeção nova que você cria sozinho vira um motivo a mais pra ela não fechar agora. Resolva só a objeção que ela de fato levantou.`,

  qualificacao: `Fonte: Aula 26/05 — Funil simples para mentorias premium (Filippe Neto).

Qualificação não é sobre "quanto tempo esperar" — é sobre sinais de prontidão. Ao invés de mandar mensagem de venda direto ("vi que você baixou o e-book, acho que tem potencial pra minha mentoria" — que soa forçado e a pessoa se defende: "deixa eu ler primeiro, se eu gostar eu te chamo"), acompanhe sinais reais de engajamento: ela terminou de consumir o conteúdo? Está em processo? Nem começou? Em volume, isso vira uma fila priorizada — quem está mais pronto entra primeiro na abordagem, não quem entrou há mais tempo.

Mesmo depois de fechar (contrato assinado, primeiro pagamento feito), a qualificação continua: se os pagamentos seguintes atrasam, é sinal de que o comprometimento real não bateu com o que pareceu no fechamento. Documentar o "indicador de sucesso" combinado com o lead desde o início (o que ele espera alcançar, em que prazo) dá munição pra essa conversa depois — evita ficar só no "ele disse que ia pagar".`,

  retomada_conexao_esfriou: `Fonte: Aula 23/06 — Método de follow-up que não soa como pressão (Leandro Schlemper, time Voz).

Retomar não é "oi, tudo bem?" — é usar um gatilho real. Gatilho é um motivo concreto e valioso pra voltar a falar com alguém: um convite pra evento, uma conexão que você pode oferecer, uma notícia relevante pro contexto da pessoa. Nunca é genérico. Exemplo usado na aula: "Como tá sua agenda pro dia X? Vou estar num evento com [pessoa relevante do nicho dela], queria te fazer um convite — vai ser muito relevante pra você."

Âncora: se você tem alguma associação, conexão ou prova social que dá peso à sua mensagem (ex: "ando com Fulano", "tenho acesso a Beltrano"), usa isso pra ganhar atenção — não como ostentação, como motivo real de a pessoa prestar atenção na sua mensagem de novo.

Se a pessoa responde "top" e para por aí, não força a venda — continua o relacionamento: "quanto tempo que a gente não se fala, como estão as coisas, com quem você tá andando?" Reconstrói o vínculo antes de pedir qualquer coisa de novo.

Seja "interessante", não "interesseiro": a régua de retomada funciona melhor quando a pessoa te vê como alguém que conecta e resolve (uma "ponte"), não como alguém que só aparece quando quer vender. Pergunte "você tá precisando de alguma coisa?" genuinamente, mesmo sem intenção de venda imediata — isso é o que faz a pessoa voltar a procurar você quando ela precisar.

Medição prática: se você reativa uma lista de contatos frios e menos de 25% responde, o relacionamento esfriou de verdade — precisa investir mais em presença (curtir, comentar, aparecer) antes da próxima tentativa de contato direto.`,

  retomada_proposta_aberta: `Fonte: Aula bônus - social selling, 23/06 (Leandro Schlemper, time Voz).

Quando o link/proposta já foi enviado e a pessoa não respondeu, ela não some da fila — vira um estado que precisa de cobrança ativa: "você precisa estar cobrando a pessoa de fazer o pagamento." O time usa tag "enviado" pra marcar quem está nesse ponto e conseguir filtrar visualmente quem precisa do próximo toque, sem depender de lembrar de cabeça.

O toque de cobrança não repete a proposta — pergunta o que travou ("que que tá acontecendo, o que você precisa de ajuda?") e resolve a objeção específica que aparecer, sem baixar o valor de cara. Se travou por causa de agenda/data, pergunta objetivamente ("você tem algo marcado nesse dia?") em vez de deixar a proposta esfriando no vácuo.`,

  retomada_nao_prioridade: `Fonte: Aula 23/06 — Método de follow-up que não soa como pressão (Leandro Schlemper, time Voz).

Cadência de manutenção de longo prazo: pelo menos uma vez por mês (idealmente a cada 15 dias, se der conta), toca cada contato que não é prioridade agora. Não é sobre vender — é sobre não deixar o relacionamento morrer. Um toque simples de presença ("e aí, como estão as coisas?") sustenta a porta aberta pra quando a prioridade da pessoa mudar.

Seja a "ponte": quando alguém da sua lista de nutrição de longo prazo tiver uma necessidade (não necessariamente a sua oferta), conecte essa pessoa com quem pode ajudar — isso constrói a reputação de "pessoa que resolve", e é o que faz ela voltar a te procurar quando finalmente for prioridade.`,
};
