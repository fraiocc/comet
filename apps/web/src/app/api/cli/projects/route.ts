import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { projects, targets } from "@/db/schema";
import { authenticateCliRequest } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const user = await authenticateCliRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  const githubToken = user.encryptedGithubToken
    ? decryptSecret(user.encryptedGithubToken)
    : null;

  if (userProjects.length === 0) {
    return NextResponse.json({ projects: [], githubToken });
  }

  const projectIds = userProjects.map((p) => p.id);
  const allTargets = await db
    .select()
    .from(targets)
    .where(inArray(targets.projectId, projectIds));

  const payload = userProjects.map((project) => ({
    id: project.id,
    repoFullName: project.repoFullName,
    displayName: project.displayName,
    assetPattern: project.assetPattern,
    defaultChangelog: project.defaultChangelog,
    targets: allTargets
      .filter((t) => t.projectId === project.id)
      .map((t) => ({
        id: t.id,
        kind: t.kind,
        enabled: t.enabled,
        externalProjectId: t.externalProjectId,
        token: decryptSecret(t.encryptedToken),
        gameVersions: t.gameVersions,
        loaders: t.loaders,
        dependencies: t.dependencies,
        channel: t.channel,
        descriptionOverride: t.descriptionOverride,
      })),
  }));

  return NextResponse.json({ projects: payload, githubToken });
}

export async function POST(req: NextRequest) {
  const user = await authenticateCliRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    repoFullName?: string;
    displayName?: string;
    assetPattern?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repoFullName = body.repoFullName?.trim();
  const displayName = body.displayName?.trim();
  const assetPattern = body.assetPattern?.trim() || "*.jar";

  if (!repoFullName || !repoFullName.includes("/")) {
    return NextResponse.json({ error: "repoFullName must be owner/repo" }, { status: 400 });
  }

  const existing = await db
    .select({ id: projects.id, repoFullName: projects.repoFullName })
    .from(projects)
    .where(eq(projects.userId, user.id));

  if (existing.some((p) => p.repoFullName.toLowerCase() === repoFullName.toLowerCase())) {
    return NextResponse.json({ error: "This repository is already configured" }, { status: 409 });
  }

  const [created] = await db
    .insert(projects)
    .values({
      userId: user.id,
      repoFullName,
      displayName: displayName || repoFullName.split("/")[1] || repoFullName,
      assetPattern,
    })
    .returning({
      id: projects.id,
      repoFullName: projects.repoFullName,
      displayName: projects.displayName,
      assetPattern: projects.assetPattern,
    });

  return NextResponse.json({ project: created }, { status: 201 });
}
