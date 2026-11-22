import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, targets, type TargetDependency } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { isValidDiscordWebhookUrl } from "@/lib/discord";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as {
    assetPattern?: string;
    defaultChangelog?: string | null;
    displayName?: string;
    discordWebhookUrl?: string | null;
  };

  const webhook = body.discordWebhookUrl?.trim() || null;
  if (webhook && !isValidDiscordWebhookUrl(webhook)) {
    return NextResponse.json(
      { error: "Enter a valid Discord webhook URL (https://discord.com/api/webhooks/...)" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(projects)
    .set({
      assetPattern: body.assetPattern?.trim() || "*.jar",
      defaultChangelog: body.defaultChangelog ?? null,
      displayName: body.displayName?.trim(),
      discordWebhookUrl: webhook,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project: updated });
}

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

  const body = (await req.json()) as {
    kind?: string;
    enabled?: boolean;
    externalProjectId?: string;
    token?: string;
    gameVersions?: string[];
    loaders?: string[];
    dependencies?: TargetDependency[];
    channel?: string | null;
    descriptionOverride?: string | null;
  };

  if (body.kind !== "modrinth" && body.kind !== "hangar") {
    return NextResponse.json({ error: "Unsupported target kind" }, { status: 400 });
  }
  if (!body.externalProjectId?.trim() || !body.token?.trim()) {
    return NextResponse.json(
      { error: "externalProjectId and token are required" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(targets)
    .values({
      projectId: project.id,
      kind: body.kind,
      enabled: body.enabled ?? true,
      externalProjectId: body.externalProjectId.trim(),
      encryptedToken: encryptSecret(body.token.trim()),
      gameVersions: body.gameVersions ?? [],
      loaders: body.loaders ?? [],
      dependencies: body.dependencies ?? [],
      channel: body.channel?.trim() || null,
      descriptionOverride: body.descriptionOverride?.trim() || null,
    })
    .returning({
      id: targets.id,
      kind: targets.kind,
      enabled: targets.enabled,
      externalProjectId: targets.externalProjectId,
      gameVersions: targets.gameVersions,
      loaders: targets.loaders,
      dependencies: targets.dependencies,
      channel: targets.channel,
      descriptionOverride: targets.descriptionOverride,
    });

  return NextResponse.json({ target: created }, { status: 201 });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .returning({ id: projects.id });

  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
