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

## 08 — Serviços externos

Credenciais nunca neste doc. Chaves, tokens e senhas ficam no `.env.local` do servidor e no gerenciador de senhas. Acesso SSH e convite ao painel da Meta são passados por canal separado.

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
