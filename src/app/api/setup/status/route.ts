import { NextResponse } from "next/server";

// Diagnóstico de configuração — nunca expõe valor, só presença/ausência.
// Sem auth de propósito: é informação de baixa sensibilidade (o que já foi
// configurado, não os segredos em si) e existe justamente pra poder ser
// checado de fora sem precisar de sessão nem de colar credencial em lugar
// nenhum. Ver docs/handoff-tecnico.md, seção 08.
function presente(valor: string | undefined): boolean {
  return !!valor && valor.trim().length > 0;
}

export async function GET() {
  return NextResponse.json({
    ia: {
      openai: presente(process.env.OPENAI_API_KEY),
      anthropic: presente(process.env.ANTHROPIC_API_KEY),
      gemini: presente(process.env.GEMINI_API_KEY),
    },
    instagram: {
      appId: presente(process.env.IG_APP_ID),
      appSecret: presente(process.env.IG_APP_SECRET),
      redirectUri: presente(process.env.IG_REDIRECT_URI),
      webhookVerifyToken: presente(process.env.IG_WEBHOOK_VERIFY_TOKEN),
    },
    app: {
      cronSecret: presente(process.env.CRON_SECRET),
      sessionSecret: presente(process.env.SESSION_SECRET),
    },
    banco: {
      // Sem DB_PATH customizado, a Vercel cai em /tmp — efêmero (handoff, seção 04).
      persistente: presente(process.env.DB_PATH) || !process.env.VERCEL,
    },
  });
}
