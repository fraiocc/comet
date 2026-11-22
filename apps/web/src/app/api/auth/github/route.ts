import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/login?error=github_not_configured`);
  }

  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("comet_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/callback`,
    scope: "read:user user:email repo read:org",
    state,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
