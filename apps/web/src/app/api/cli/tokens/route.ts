import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { cliTokens } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await db
    .select({
      id: cliTokens.id,
      name: cliTokens.name,
      lastUsedAt: cliTokens.lastUsedAt,
      createdAt: cliTokens.createdAt,
    })
    .from(cliTokens)
    .where(eq(cliTokens.userId, user.id))
    .orderBy(desc(cliTokens.createdAt));

  return NextResponse.json({ tokens });
}
