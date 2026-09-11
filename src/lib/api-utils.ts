import { NextResponse } from "next/server";
import { ErroApi } from "./auth";

export function erroParaResposta(err: unknown): NextResponse {
  if (err instanceof ErroApi) {
    return NextResponse.json({ erro: err.message }, { status: err.status });
  }
  console.error(err);
  const mensagem = err instanceof Error ? err.message : "Erro inesperado.";
  return NextResponse.json({ erro: mensagem }, { status: 500 });
}
