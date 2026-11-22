import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createSessionCookie, getSessionUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const store = await cookies();
  const expectedState = store.get("comet_oauth_state")?.value;
  store.delete("comet_oauth_state");

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_state`);
  }

  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenResp.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_token`);
  }

  const encryptedGithubToken = encryptSecret(tokenData.access_token);

  const userResp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!userResp.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=github_user`);
  }

  const ghUser = (await userResp.json()) as GitHubUser;
  const githubId = String(ghUser.id);
  const currentUser = await getSessionUser();

  const [existingByGithub] = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubId))
    .limit(1);

  if (currentUser) {
    if (existingByGithub && existingByGithub.id !== currentUser.id) {
      return NextResponse.redirect(`${appUrl}/dashboard?error=github_already_linked`);
    }
    await db
      .update(users)
      .set({
        githubId,
        githubUsername: ghUser.login,
        encryptedGithubToken,
        avatarUrl: ghUser.avatar_url,
      })
      .where(eq(users.id, currentUser.id));
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }

  let userId: string;
  if (existingByGithub) {
    await db
      .update(users)
      .set({
        githubUsername: ghUser.login,
        encryptedGithubToken,
        avatarUrl: ghUser.avatar_url,
      })
      .where(eq(users.id, existingByGithub.id));
    userId = existingByGithub.id;
  } else {
    const normalizedEmail = ghUser.email?.toLowerCase() ?? null;
    const [existingByEmail] = normalizedEmail
      ? await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
      : [];

    if (existingByEmail) {
      await db
        .update(users)
        .set({
          githubId,
          githubUsername: ghUser.login,
          encryptedGithubToken,
          avatarUrl: ghUser.avatar_url,
        })
        .where(eq(users.id, existingByEmail.id));
      userId = existingByEmail.id;
    } else {
      const [inserted] = await db
        .insert(users)
        .values({
          githubId,
          githubUsername: ghUser.login,
          encryptedGithubToken,
          username: ghUser.login,
          email: normalizedEmail,
          avatarUrl: ghUser.avatar_url,
        })
        .returning({ id: users.id });
      userId = inserted.id;
    }
  }

  await createSessionCookie(userId);
  return NextResponse.redirect(`${appUrl}/dashboard`);
}
