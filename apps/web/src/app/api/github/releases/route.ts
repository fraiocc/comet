import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { fetchRepoReleases } from "@/lib/github";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = req.nextUrl.searchParams.get("repo")?.trim();
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return NextResponse.json({ error: "Invalid repository format" }, { status: 400 });
  }

  try {
    const token = user.encryptedGithubToken ? decryptSecret(user.encryptedGithubToken) : null;
    const releases = await fetchRepoReleases(repo, token);
    return NextResponse.json({ releases });
  } catch {
    return NextResponse.json({ error: "Failed to load releases from GitHub" }, { status: 502 });
  }
}
