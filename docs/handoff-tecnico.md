# Handoff técnico · Voz Selling · set 2026

Passando o bastão: o que é, como roda, como sobe, onde estão as armadilhas e o que falta.

**Nota de escopo desta instância**: uso interno, não um produto vendido a clientes externos. Sem cobrança — não tem PagDream, não tem Mercado Pago, não tem planos/contratos/créditos. `workspace` aqui só organiza processos internos (ex: contas/times diferentes), não é um "cliente pagante".

## Comece por aqui

Clone, crie o `.env.local` (peça as chaves ao responsável — nunca estão neste doc), rode `npm install` e `npm run dev`. Abre em `localhost:3000`. O banco é um arquivo (`data/dreamrobot.db`). Leia a seção 9 (Armadilhas) antes do primeiro commit.

## 01 — O que é

Voz Selling é uma ferramenta de prospecção e condução de vendas no Instagram. O operador aborda leads; a partir da segunda mensagem, uma IA conduz a conversa dentro da janela de 24h da Meta, qualifica o lead (nota 0–100), organiza tudo num pipeline por etapas, e mantém uma régua de retomada para quem parou de responder. É multi-tenant: vários clientes (workspaces) no mesmo app, isolados por `workspace_id`.

## 02 — Stack

- **Framework**: Next.js 15 · React 19, App Router puro, TypeScript. Server Components acessam o banco direto.
- **Banco**: SQLite (`better-sqlite3`). Um arquivo, acesso síncrono. Sem ORM. Conexão em cache no `globalThis`.
- **IA**: OpenAI `gpt-4o-mini` via `A1_MODEL`/`A3_MODEL`. Chaves Anthropic e Gemini também suportadas — troca é só variável de ambiente (`src/lib/llm.ts`).
- **CSS**: Tailwind 4. Sem `tailwind.config`. Tokens em `@theme` dentro de `globals.css`.
- **Externos**: Meta (Instagram Messaging API oficial), Apify (raspagem, módulo à parte). Sem cobrança nesta instância.
- **Produção**: VPS Ubuntu · systemd, atrás de Caddy. Deploy por script (`scripts/subir.sh`). Node 22.

## 03 — Rodar local

```bash
npm install

# .env.local — peça as chaves ao responsável. Mínimo para subir:
OPENAI_API_KEY=...
A1_MODEL=gpt-4o-mini
A3_MODEL=gpt-4o-mini
APIFY_TOKEN=...           # opcional local
IG_APP_ID=...
IG_APP_SECRET=...
CRON_SECRET=qualquer-coisa

npm run dev

# criar um acesso admin no banco local
node scripts/criar-acesso.mjs --email voce@x.com --papel admin --nome "Voce"
```

Sem `OPENAI_API_KEY` o app abre, mas os agentes (análise, conversa, retomada) falham na hora de gerar texto.

## 04 — Como está no ar

Produção é uma VPS Ubuntu (não Vercel, não Railway). App em `/var/www/dreamrobot`, serviço systemd `dreamrobot`, Caddy fazendo o HTTPS.

```bash
bash scripts/subir.sh
curl https://app.dreamrobot.com.br/api/health   # {"ok":true}
```

A pasta `data/` é sagrada — é onde vive o banco. O deploy NÃO a toca. Nunca `rsync --delete` sobre ela. Backup: é um arquivo só, `cp` diário resolve.

Crons no servidor: piloto (`/api/cron/piloto`) a cada minuto, retomada (`/api/cron/retomada`) em lotes. Comentários automáticos disparam pelo webhook do Instagram, não por cron.

## 05 — Arquitetura

| Pasta | O que é |
|---|---|
| `src/app/social/**` | Painel do cliente (o aluno). |
| `src/app/admin/**` | Painel interno. Gere workspaces, usuários, configurações. |
| `src/app/api/**` | Rotas de API. Auth por `requireApiUser`/`requireAdmin`. |
| `src/lib/**` | Toda a lógica de domínio. |

O painel do cliente reusa os componentes do admin: as telas do cliente importam os componentes que vivem em `src/app/admin/dr/` e passam os dados do workspace. Mexer na aparência de um componente muda as duas telas — são a mesma implementação, duas peles.

Comportamento nunca depende do NOME da etapa, e sim do papel que ela declara (`papeis.ts`). Etapas são customizáveis pelo cliente; a regra lê o papel.

| Papel | O que acontece |
|---|---|
| `fila` | Fora do pipeline (fila do Ranking). A IA não fala. |
| `prepara` | Entrou, conversa não começou. A IA não puxa assunto. |
| `conduz` | A IA responde sozinha dentro da janela de 24h. |
| `encerra` | Saiu das mãos do robô. Quem fala é o operador. |
| `nutre` | Presença de longo prazo, sem cobrança. |

## 06 — Comportamento do robô

Funil: Prospecção → Adição → Conexão → Condução → Convite → Agendamento → Acompanhamento. O operador entra no início e no fim.

A régua do relógio (contada em mensagens que o robô escreveu, não no total): até a 3ª = Conexão · 4ª–9ª = Condução/sondagem · 10ª = Convite · 11ª–15ª = Agendamento.

Retomada: 7 follow-ups por etapa, cada uma com fala e ritmo próprios, contador zera quando o lead avança. Ver `src/lib/retomada.ts`.

Arquivos: `retomada.ts`, `agent-retomada.ts`, `piloto.ts`, `agent-piloto.ts`, `agent-a1.ts`.

### Base de conhecimento do método (`metodologia.ts`)

`agent-a1`, `agent-piloto` e `agent-retomada` combinam a regra estrutural do código (régua, faixas de nota) com o conteúdo salvo na tabela `metodologia` — editável em `/admin/metodologia`, sem precisar de deploy. `src/lib/metodologia-seed.ts` traz o conteúdo inicial das 13 seções (cobertura completa), extraído de aulas reais do Filippe Neto e do time Voz (via tldv, set/2026), do questionário "Definindo a sua comunicação" respondido pelo próprio Filippe, e do manual oficial "Social Selling":

| Seção | Fonte |
|---|---|
| `tom_de_voz` | Aula 09/06 · questionário "Definindo a sua comunicação" (Filippe) · manual Social Selling |
| `conexao` | Aula 02/06 · manual Social Selling (modelos de ADIÇÃO e CONEXÃO) |
| `conducao` | Aula 02/06 · manual Social Selling (modelos de CONDUÇÃO) |
| `convite` | Aula bônus 23/06 · manual Social Selling (scripts por origem: novos seguidores, comentários, stories, direct) |
| `agendamento` | Aula 07/04 · manual Social Selling (Sessão de Diagnóstico → confirmação por WhatsApp) |
| `qualificacao` | Aula 26/05 — Funil simples para mentorias premium |
| `retomada_ativacao_nao_respondeu` | Aula bônus 23/06 e Aula 02/06 · manual Social Selling (scripts de Follow-Up e de despedida) |
| `retomada_conexao_esfriou` | Aula 23/06 — Método de follow-up que não soa como pressão |
| `retomada_conducao_sentiu_venda` | Aula 07/04 — Como conduzir uma call sem parecer vendedor |
| `retomada_agendamento` | Aula 12/05 — Como transformar conversas em vendas |
| `retomada_proposta_aberta` | Aula bônus 23/06 — Social selling |
| `retomada_sem_caixa` | Aula 07/04 — Como conduzir uma call sem parecer vendedor |
| `retomada_nao_prioridade` | Aula 23/06 — Método de follow-up que não soa como pressão |

Vocabulário do método (manual oficial): o funil do próprio Filippe é Adição → Conexão → Condução → Conversão → Relacionamento. "Conversão" no vocabulário dele cobre o que a ferramenta trata como `convite` + `agendamento` na régua — a Sessão de Diagnóstico é a call de fechamento, e o WhatsApp é o ambiente final de confirmação ("direcionar pro wpp"), nunca o direct. Essa equivalência está documentada no próprio conteúdo de `tom_de_voz`, sem exigir renomear nada no código.

## 07 — Subsistemas-chave

- `llm.ts` — camada de IA, troca de provedor por env.
- `db.ts` — conexão SQLite + migrações.
- `auth.ts` — sessão (cookie httpOnly), guards.
- `etapas.ts` · `papeis.ts` — funil por workspace.
- `piloto.ts` · `agent-piloto.ts` — robô da conversa ao vivo.
- `retomada.ts` · `agent-retomada.ts` — régua de retomada.
- `agent-a1.ts` — análise do perfil e nota 0–100.
- `instagram-*.ts` — oauth, api, sync.
- `daily-limits.ts` — freios de volume.
- `comentarios.ts` — automático por faixa de nota.
- `buscar-perfil.ts` — raspagem via Apify (módulo Dream Pickup).
- `carreira.ts` — escada de carreira do Social Seller (seção 06.1 abaixo).

### 06.1 — Escada de carreira (`carreira.ts`)

Do manual "Método VOZ SELLING™", capítulo 9: executor → intérprete → gestor → expert
(`usuarios.nivel_carreira`). Métricas semanais (abordagens, sessões agendadas via
etapa de papel `encerra`, % de resposta, tempo médio de resposta) são calculadas
só sobre `leads.responsavel_id` — um lead precisa estar atribuído a um operador
(seletor no Pipeline) para contar na carreira dele. Sem atribuição, métrica zerada
— nunca mistura o trabalho de duas pessoas do mesmo workspace.

`avaliarSinalizacaoPromocao` compara com as metas do manual (150-200 abordagens/semana,
10-15 sessões, ≥40% resposta, <4h tempo de resposta) e só **sinaliza** — a promoção em
si (`definirNivel`) é sempre uma ação humana do admin, registrada em `nivel_eventos`
para auditoria. Não existe conversão sessão→venda aqui: esta instância não tem
conceito de venda/pagamento no banco (uso interno, sem cobrança).

Telas: `/social/carreira` (o operador vê a própria carreira, sem editar) e
`/admin/workspaces/[id]` → "ver carreira" por operador (admin promove/rebaixa).
Componente compartilhado: `dr/Carreira.tsx`.

## 08 — Serviços externos

Credenciais nunca neste doc. Chaves, tokens e senhas ficam no `.env.local` do servidor e no gerenciador de senhas. Acesso SSH e convite ao painel da Meta são passados por canal separado.

### 08.1 — Conectando uma conta do Instagram (passo a passo)

Conta profissional (Business/Creator) — conta pessoal não conecta. O fluxo de OAuth já está pronto no código (`instagram-oauth.ts`, `/api/instagram/conectar`, `/api/auth/instagram/callback`); o que falta em uma instância nova é sempre configuração do lado da Meta.

**1) Criar o app na Meta (uma vez só, por instância)**
1. Em [developers.facebook.com](https://developers.facebook.com), crie um app com o produto **Instagram API with Instagram Login** (login direto pela conta do Instagram, sem precisar de Página do Facebook).
2. Anote o **App ID** e o **App Secret**.
3. Scopes que o app precisa aprovar — já são exatamente os que `gerarUrlAutorizacao` pede: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`.
4. Configure o **Webhook** do app: URL `https://SEU-DOMINIO/api/webhooks/instagram`, com um verify token de sua escolha (precisa bater com `IG_WEBHOOK_VERIFY_TOKEN` no passo 2).
5. Sem **App Review** aprovado pela Meta, só contas marcadas como **testadoras** dentro do app conseguem conectar. Pra testar agora, adiciona a conta que vai usar como testadora — aí conecta e funciona de verdade sem esperar o review.

**2) Variáveis de ambiente (Vercel → Settings → Environment Variables, ou `.env.local` na VPS)**
```
IG_APP_ID=<App ID do passo 1>
IG_APP_SECRET=<App Secret do passo 1>
IG_REDIRECT_URI=https://SEU-DOMINIO/api/auth/instagram/callback
IG_WEBHOOK_VERIFY_TOKEN=<o mesmo token colocado no webhook>
```
Env var nova só entra depois de um redeploy.

**3) Conectar dentro do Voz Selling**
1. Login como admin → `/admin/workspaces/[id]` (o workspace de quem vai usar essa conta).
2. Botão **"Conectar Instagram"** → autoriza no Instagram → volta pelo callback, que já salva o token em `contas_instagram` sozinho.
3. Confirma em `/admin/workspaces/[id]` que aparece "Conectado como @usuario".

**4) Depois de conectado**
Nada mais precisa ser configurado — assim que os crons `piloto`/`retomada` estiverem rodando, o robô já responde os DMs usando o conteúdo de `/admin/metodologia`. Token dura ~60 dias e renova sozinho.

### 08.2 — Disparando os crons no Vercel

Na VPS, o crontab chama `/api/cron/piloto` a cada minuto e `/api/cron/retomada` em lotes (seção 04). No Vercel isso não existe pronto, e o plano Hobby do Vercel Cron só permite 1x/dia — não serve pra responder DM em poucos minutos.

Solução: `.github/workflows/crons.yml`, já no repositório. Roda no GitHub Actions (grátis) e chama os dois endpoints via `curl` com o header `x-cron-secret`. Só precisa de 2 segredos no GitHub (Settings → Secrets and variables → Actions):
- `VOZ_SELLING_URL` — a URL de produção (sem barra no final).
- `CRON_SECRET` — o mesmo valor configurado no Vercel.

Sem esses segredos, o workflow roda mas falha na chamada (401). O agendamento do GitHub Actions tem folga de alguns minutos (não é ao segundo) — normal, não é bug.

## 09 — Armadilhas conhecidas

1. **Migração de schema não roda sozinha.** A conexão fica em cache no `globalThis`. `ALTER TABLE` novo em `db.ts` só roda depois de reiniciar o processo.
2. **Várias sessões mexendo no repo ao mesmo tempo.** `git status` antes de editar; `git add <caminho>` específico, nunca `git add -A`.
3. **Comportamento pelo NOME da etapa é bug garantido.** Pergunte ao papel (`papeis.ts`), nunca ao label.
4. **Datas: sempre `datetime('now','localtime')`.** `new Date().toISOString()` é UTC — quebra freios diários no Brasil.
5. **`next-env.d.ts` e cache de tipos do Next.** `rm -rf .next*/types` resolve erro fantasma no `tsc`.
6. **Comentário explica por quê, não o quê.**

## 10 — Estado atual & pendências

- **Esqueleto no ar**: núcleo funcional criado nesta sessão (schema, lib de domínio, rotas, UI). Ainda não testado contra contas reais do Instagram nem chaves de produção.
- **Segurança**: guards de workspace (`requireWorkspaceAccess`) aplicados nas rotas criadas; auditoria completa das rotas ainda pendente conforme o produto crescer.
- **Bloqueio**: Meta App Review — sem isso, só contas testadoras conectam.
- **Dívida conhecida**: SQLite não escala além de ~20 usuários com folga; migração para Postgres antes de 50 clientes.
