import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { sendDiscordTestEmbed } from "@/lib/discord";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { webhookUrl?: string };
  const url = body.webhookUrl?.trim() || project.discordWebhookUrl || "";

  const result = await sendDiscordTestEmbed(url, project.displayName, project.repoFullName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Webhook test failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
