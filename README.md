# Voz Selling

Prospecção e condução de vendas no Instagram — IA qualifica leads, conduz a conversa dentro da janela de 24h da Meta, organiza num pipeline por etapas e mantém retomada para quem parou de responder.

## Rodar local

```bash
cp .env.example .env.local   # preencha as chaves
npm install
npm run dev
node scripts/criar-acesso.mjs --email voce@x.com --papel admin --nome "Voce"
```

Abre em `http://localhost:3000`.

## Documentação

- [`docs/handoff-tecnico.md`](docs/handoff-tecnico.md) — stack, como roda, como sobe, armadilhas conhecidas.
- [`docs/social/spec.md`](docs/social/spec.md) — regras de comportamento do produto (régua do relógio, nota, retomada, freios).
