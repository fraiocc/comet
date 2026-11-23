import { NextRequest } from "next/server";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { projects, publishHistory } from "@/db/schema";
import { parseBadgeStyle, renderBadgeSvg } from "@/lib/badge";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await context.params;
  const style = parseBadgeStyle(req.nextUrl.searchParams.get("style"));
  const fullName = `${owner}/${repo}`.toLowerCase();

  const [project] = await db
    .select({
      id: projects.id,
      displayName: projects.displayName,
      repoFullName: projects.repoFullName,
    })
    .from(projects)
    .where(sql`lower(${projects.repoFullName}) = ${fullName}`)
    .limit(1);

  if (!project) {
    const svg = renderBadgeSvg({
      projectName: repo,
      version: "not found",
      platforms: [],
      style: "pill",
    });
    return new Response(svg, {
      status: 404,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const recent = await db
    .select({
      releaseTag: publishHistory.releaseTag,
      results: publishHistory.results,
    })
    .from(publishHistory)
    .where(eq(publishHistory.projectId, project.id))
    .orderBy(desc(publishHistory.createdAt))
    .limit(10);

  let latestVersion: string | null = null;
  let succeededPlatforms: string[] = [];

  for (const row of recent) {
    const ok = row.results.filter((r) => r.status === "success").map((r) => r.kind);
    if (ok.length > 0) {
      latestVersion = row.releaseTag;
      succeededPlatforms = ok;
      break;
    }
  }

  const svg = renderBadgeSvg({
    projectName: project.displayName,
    version: latestVersion,
    platforms: succeededPlatforms,
    style,
  });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=300",
    },
  });
}
