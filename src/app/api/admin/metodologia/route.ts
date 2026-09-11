import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listarSecoes } from "@/lib/metodologia";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ secoes: listarSecoes() });
  } catch (err) {
    return erroParaResposta(err);
  }
}
