# Especificação · Voz Selling · set 2026

Como o produto funciona, as regras que decidem o comportamento do robô, e por que cada decisão é essa. Referência de comportamento — não de código.

O produto: prospecção e condução de vendas no Instagram. O operador dá o primeiro toque; a IA conduz a conversa dentro da janela de 24h da Meta, qualifica cada lead de 0 a 100, organiza num pipeline por etapas, e mantém uma régua de retomada para quem parou de responder.

Funil: **Prospecção → Adição → Conexão → Condução → Convite → Agendamento → Acompanhamento**

## 01 — Quem faz o quê

A primeira abordagem é do operador. O meio inteiro é do robô: da segunda mensagem até o convite, ele responde sozinho dentro da janela de 24h. De "agendado" em diante volta pro humano, junto com a Retomada de quem sumiu.

Comportamento depende do papel da etapa, nunca do nome (`src/lib/papeis.ts`).

| Papel | O que acontece |
|---|---|
| `fila` | Fora do pipeline (fila do Ranking). A IA não fala. |
| `prepara` | Entrou, mas a conversa não começou. A IA não puxa assunto. |
| `conduz` | A IA responde sozinha dentro das 24h. |
| `encerra` | Saiu das mãos do robô. Quem fala é o operador. |
| `nutre` | Presença de longo prazo, sem cobrança. |

## 02 — A régua do relógio

Contada em mensagens que o robô escreveu, não no total (`src/lib/piloto.ts`).

| Ponto | Modo |
|---|---|
| até a 3ª | Conexão — construir relação, zero venda |
| 4ª a 9ª | Condução — sondagem, entender a dor |
| 10ª | Convite |
| 11ª a 15ª | Agendamento |
| passou da 15ª | convida direto, ou devolve ao operador |

Conexão não se pula. O contador olha só o que o robô escreveu naquela conversa específica.

## 03 — Qualificação — a nota 0 a 100

Cada lead recebe uma nota de semelhança com o perfil-alvo (ICP). A nota sai da análise do perfil ou, quando a pessoa mandou DM, do que ela escreveu (`src/lib/agent-a1.ts`).

| Faixa | Ação |
|---|---|
| 90–100 | Encaixe perfeito + sinal quente + budget visível → abordar hoje |
| 70–89 | Encaixe forte, sem sinal quente → entra na cadência do dia |
| 50–69 | Encaixe parcial → abordar se sobrar capacidade |
| 30–49 | Fraco → nutrir (sem abordagem) |
| 0–29 | Fora do alvo ou regra de exclusão → descartar |

Concorrente não é lead: tem os mesmos sinais bonitos do cliente ideal. Vai para nota < 30 e "só nutrir" (nunca descartar).

## 04 — Retomada — 7 por etapa

Cadência de 7 follow-ups por etapa/motivo, contador zera quando o lead avança (`src/lib/retomada.ts`).

| Onde parou | Como fala | Ritmo |
|---|---|---|
| Ativação · nunca respondeu | Presença no perfil antes de pedir | 1/dia · 7 dias |
| Conexão · esfriou | Puxa pelo assunto que trouxe | abre o passo |
| Condução · sentiu venda | Recuo e valor, zero pergunta | 2 a 7 dias |
| Agendando/Agendado | Lembrete de horário, 2 opções | 1º toque em 2h |
| Proposta aberta | Segue falando do produto | diário na 1ª semana |
| Sem caixa | Timing, não objeção | mensal |
| Não é prioridade | Nutrição longa | trimestral |

Depois de 7 sem resposta, o lead vira nutrição.

## 05 — Os freios — por que a conta não bloqueia

`src/lib/daily-limits.ts`.

| Freio | Regra |
|---|---|
| Adições/dia | Teto configurável por workspace |
| Follows/dia | Teto separado para ações forçadas da Retomada |
| Teto por hora | 40/hora para respostas |
| Comentários | Espalhados no tempo |

Prospecção tem teto; atendimento não. Responder quem já procurou o cliente não gasta cota.

## 06 — Comentários automáticos

`src/lib/comentarios.ts`.

| Ação | O que é |
|---|---|
| Só avaliar | Ganha nota, não recebe mensagem |
| Responder no post | Frase pública sobre o conteúdo |
| Responder e chamar | Responde no post e manda o direct |

## 07 — O que a Meta permite

Núcleo 100% API oficial (Instagram Messaging, Instagram Login). A raspagem (Dream Pickup, `src/lib/buscar-perfil.ts`) é módulo à parte, via Apify, fora do app oficial.

## 08 — Vocabulário

| Escreva | Não escreva |
|---|---|
| créditos | tokens |
| nota / % match | score de conversão, HOT LEAD |
| Direct, Ranking, Pipeline, Retomada | (nomes de tela não mudam) |
| Conexão, Condução | (nomes de etapa não mudam) |
