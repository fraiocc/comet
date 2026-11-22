import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, targets, type TargetDependency } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { isUuid } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; targetId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, targetId } = await context.params;
  if (!isUuid(id) || !isUuid(targetId)) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    externalProjectId?: string;
    token?: string;
    gameVersions?: string[];
    loaders?: string[];
    dependencies?: TargetDependency[];
    channel?: string | null;
    descriptionOverride?: string | null;
  };

  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (typeof body.enabled === "boolean") updateFields.enabled = body.enabled;
  if (body.externalProjectId?.trim()) {
    updateFields.externalProjectId = body.externalProjectId.trim();
  }
  if (body.token?.trim()) {
    updateFields.encryptedToken = encryptSecret(body.token.trim());
  }
  if (Array.isArray(body.gameVersions)) updateFields.gameVersions = body.gameVersions;
  if (Array.isArray(body.loaders)) updateFields.loaders = body.loaders;
  if (Array.isArray(body.dependencies)) updateFields.dependencies = body.dependencies;
  if (body.channel !== undefined) updateFields.channel = body.channel?.trim() || null;
  if (body.descriptionOverride !== undefined) {
    updateFields.descriptionOverride = body.descriptionOverride?.trim() || null;
  }

  const [updated] = await db
    .update(targets)
    .set(updateFields)
    .where(and(eq(targets.id, targetId), eq(targets.projectId, project.id)))
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

  if (!updated) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  return NextResponse.json({ target: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; targetId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, targetId } = await context.params;
  if (!isUuid(id) || !isUuid(targetId)) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [deleted] = await db
    .delete(targets)
    .where(and(eq(targets.id, targetId), eq(targets.projectId, project.id)))
    .returning({ id: targets.id });

  if (!deleted) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
