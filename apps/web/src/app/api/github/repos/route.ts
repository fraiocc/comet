import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { fetchUserRepos } from "@/lib/github";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.encryptedGithubToken) {
    return NextResponse.json({ error: "GitHub account not connected", code: "github_required" }, { status: 400 });
  }

  try {
    const token = decryptSecret(user.encryptedGithubToken);
    const repos = await fetchUserRepos(token);
    return NextResponse.json({ repos });
  } catch {
    return NextResponse.json({ error: "Failed to load repositories from GitHub" }, { status: 502 });
  }
}
