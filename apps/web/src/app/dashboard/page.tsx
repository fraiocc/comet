import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";

import { DashboardClient } from "@/components/DashboardClient";
import { Navbar } from "@/components/Navbar";
import { db } from "@/db";
import { projects, targets } from "@/db/schema";
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
  const projectTargets =
    projectIds.length > 0
      ? await db.select().from(targets).where(inArray(targets.projectId, projectIds))
      : [];

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

  return (
    <div className="min-h-screen overflow-x-clip">
      <Navbar username={user.username} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <DashboardClient
          initialProjects={summaries}
          initialGithubUsername={user.githubUsername}
          initialHasGithubToken={Boolean(user.encryptedGithubToken)}
          hasPassword={Boolean(user.passwordHash)}
        />
      </main>
    </div>
  );
}
