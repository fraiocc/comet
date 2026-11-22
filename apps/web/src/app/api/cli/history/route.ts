import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, publishHistory, type PublishResultItem } from "@/db/schema";
import { authenticateCliRequest } from "@/lib/auth";
import { sendDiscordReleaseEmbed } from "@/lib/discord";

export async function POST(req: NextRequest) {
  const user = await authenticateCliRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    projectId?: string;
    releaseTag?: string;
    assetName?: string;
    source?: string;
    results?: PublishResultItem[];
  };

  if (!body.projectId || !body.releaseTag?.trim() || !body.assetName?.trim()) {
    return NextResponse.json(
      { error: "projectId, releaseTag, and assetName are required" },
      { status: 400 },
    );
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, body.projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const results = Array.isArray(body.results) ? body.results : [];
  const source = body.source === "ci" ? "ci" : "cli";

  const [entry] = await db
    .insert(publishHistory)
    .values({
      projectId: project.id,
      releaseTag: body.releaseTag.trim(),
      assetName: body.assetName.trim(),
      source,
      results,
    })
    .returning();

  let discordSent = false;
  if (project.discordWebhookUrl) {
    discordSent = await sendDiscordReleaseEmbed({
      webhookUrl: project.discordWebhookUrl,
      projectName: project.displayName,
      repoFullName: project.repoFullName,
      releaseTag: entry.releaseTag,
      assetName: entry.assetName,
      results,
    });
  }

  return NextResponse.json({ entry, discordSent }, { status: 201 });
}
