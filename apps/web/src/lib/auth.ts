import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";

import { db } from "@/db";
import { cliTokens, users } from "@/db/schema";
import { hashToken } from "@/lib/crypto";

const SESSION_COOKIE = "comet_session";

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (!payload.sub) {
      return null;
    }
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

export async function authenticateCliRequest(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const rawToken = authHeader.slice("Bearer ".length).trim();
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const [record] = await db
    .select({
      tokenId: cliTokens.id,
      user: users,
    })
    .from(cliTokens)
    .innerJoin(users, eq(cliTokens.userId, users.id))
    .where(eq(cliTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record) {
    return null;
  }

  await db
    .update(cliTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(cliTokens.id, record.tokenId));

  return record.user;
}
