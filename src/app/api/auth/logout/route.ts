import { NextResponse } from "next/server";
import { destruirSessao } from "@/lib/auth";
import { erroParaResposta } from "@/lib/api-utils";

export async function POST() {
  try {
    await destruirSessao();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroParaResposta(err);
  }
}
