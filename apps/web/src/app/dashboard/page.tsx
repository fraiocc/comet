import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";

import { DashboardClient } from "@/components/DashboardClient";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { db } from "@/db";
import { projects, publishHistory, targets } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  const projectIds = userProjects.map((p) => p.id);
  const [projectTargets, recentHistoryRows] =
    projectIds.length > 0
      ? await Promise.all([
          db.select().from(targets).where(inArray(targets.projectId, projectIds)),
          db
            .select({
              id: publishHistory.id,
              projectId: publishHistory.projectId,
              releaseTag: publishHistory.releaseTag,
              source: publishHistory.source,
              results: publishHistory.results,
              createdAt: publishHistory.createdAt,
            })
            .from(publishHistory)
            .where(inArray(publishHistory.projectId, projectIds))
            .orderBy(desc(publishHistory.createdAt))
            .limit(5),
        ])
      : [[], []];

  const projectById = new Map(userProjects.map((p) => [p.id, p]));

  const summaries = userProjects.map((p) => {
    const activeTargets = projectTargets.filter((t) => t.projectId === p.id && t.enabled);
    return {
      id: p.id,
      repoFullName: p.repoFullName,
      displayName: p.displayName,
      assetPattern: p.assetPattern,
      targetCount: activeTargets.length,
      targetKinds: Array.from(new Set(activeTargets.map((t) => t.kind))),
    };
  });

  const recentPublishes = recentHistoryRows.map((row) => {
    const proj = projectById.get(row.projectId);
    return {
      id: row.id,
      projectId: row.projectId,
      projectName: proj?.displayName ?? "Project",
      releaseTag: row.releaseTag,
      source: row.source,
      results: row.results,
      createdAt: row.createdAt.toISOString(),
    };
  });

  const sidebarProjects = summaries.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    repoFullName: p.repoFullName,
    targetCount: p.targetCount,
  }));

  return (
    <WorkspaceShell
      username={user.username}
      githubUsername={user.githubUsername}
      projects={sidebarProjects}
    >
      <DashboardClient
        initialProjects={summaries}
        recentPublishes={recentPublishes}
        initialGithubUsername={user.githubUsername}
        initialHasGithubToken={Boolean(user.encryptedGithubToken)}
        hasPassword={Boolean(user.passwordHash)}
      />
    </WorkspaceShell>
  );
}
