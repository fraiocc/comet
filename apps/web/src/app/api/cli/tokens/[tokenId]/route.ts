import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { cliTokens } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ tokenId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tokenId } = await context.params;
  const [deleted] = await db
    .delete(cliTokens)
    .where(and(eq(cliTokens.id, tokenId), eq(cliTokens.userId, user.id)))
    .returning({ id: cliTokens.id });

  if (!deleted) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
