import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { cliTokens } from "@/db/schema";
import { authenticateCliRequest, getSessionUser } from "@/lib/auth";
import { generateCliToken, hashToken } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const user = await authenticateCliRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    username: user.username,
    email: user.email,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const rawToken = generateCliToken();

  await db.insert(cliTokens).values({
    userId: user.id,
    name: body.name?.trim() || "CLI Token",
    tokenHash: hashToken(rawToken),
  });

  return NextResponse.json({ token: rawToken });
}
