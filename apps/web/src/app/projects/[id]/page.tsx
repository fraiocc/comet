import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { Navbar } from "@/components/Navbar";
import { ProjectDetailClient } from "@/components/ProjectDetailClient";
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
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);

  if (!project) {
    notFound();
  }

  const projectTargets = await db
    .select({
      id: targets.id,
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
    .where(eq(targets.projectId, project.id));

  const historyRows = await db
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
    .limit(30);

  const initialHistory = historyRows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen">
      <Navbar username={user.username} />
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <ProjectDetailClient
          project={project}
          initialTargets={projectTargets}
          initialHistory={initialHistory}
        />
      </main>
    </div>
  );
}
