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
