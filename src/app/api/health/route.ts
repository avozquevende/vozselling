import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  await db.prepare("SELECT 1").get();
  return NextResponse.json({ ok: true });
}
