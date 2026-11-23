import { notFound, redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";

import { ProjectDetailClient } from "@/components/ProjectDetailClient";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { db } from "@/db";
import { projects, publishHistory, targets } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  const project = userProjects.find((p) => p.id === id);
  if (!project) {
    notFound();
  }

  const projectIds = userProjects.map((p) => p.id);
  const [allUserTargets, historyRows] = await Promise.all([
    db
      .select({
        id: targets.id,
        projectId: targets.projectId,
        kind: targets.kind,
        enabled: targets.enabled,
        externalProjectId: targets.externalProjectId,
        gameVersions: targets.gameVersions,
        loaders: targets.loaders,
        dependencies: targets.dependencies,
        channel: targets.channel,
        descriptionOverride: targets.descriptionOverride,
      })
      .from(targets)
      .where(inArray(targets.projectId, projectIds)),
    db
      .select({
        id: publishHistory.id,
        releaseTag: publishHistory.releaseTag,
        assetName: publishHistory.assetName,
        source: publishHistory.source,
        results: publishHistory.results,
        createdAt: publishHistory.createdAt,
      })
      .from(publishHistory)
      .where(eq(publishHistory.projectId, project.id))
      .orderBy(desc(publishHistory.createdAt))
      .limit(30),
  ]);

  const projectTargets = allUserTargets
    .filter((t) => t.projectId === project.id)
    .map((t) => ({
      id: t.id,
      kind: t.kind,
      enabled: t.enabled,
      externalProjectId: t.externalProjectId,
      gameVersions: t.gameVersions,
      loaders: t.loaders,
      dependencies: t.dependencies,
      channel: t.channel,
      descriptionOverride: t.descriptionOverride,
    }));

  const sidebarProjects = userProjects.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    repoFullName: p.repoFullName,
    targetCount: allUserTargets.filter((t) => t.projectId === p.id && t.enabled).length,
  }));

  const initialHistory = historyRows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <WorkspaceShell
      username={user.username}
      githubUsername={user.githubUsername}
      projects={sidebarProjects}
    >
      <ProjectDetailClient
        project={project}
        initialTargets={projectTargets}
        initialHistory={initialHistory}
      />
    </WorkspaceShell>
  );
}
