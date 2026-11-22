import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Cannot unlink GitHub without a password set" },
      { status: 400 },
    );
  }

  await db
    .update(users)
    .set({
      githubId: null,
      githubUsername: null,
      encryptedGithubToken: null,
    })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
