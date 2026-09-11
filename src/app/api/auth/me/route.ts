import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { erroParaResposta } from "@/lib/api-utils";

export async function GET() {
  try {
    const usuario = await requireApiUser();
    return NextResponse.json(usuario);
  } catch (err) {
    return erroParaResposta(err);
  }
}
