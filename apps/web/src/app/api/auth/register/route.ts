import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    email?: string;
    password?: string;
  };

  const username = body.username?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!username || username.length < 2) {
    return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const [created] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash: hashPassword(password),
    })
    .returning({ id: users.id });

  await createSessionCookie(created.id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
