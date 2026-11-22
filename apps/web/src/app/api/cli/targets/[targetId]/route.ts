import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, targets } from "@/db/schema";
import { authenticateCliRequest } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ targetId: string }> },
) {
  const user = await authenticateCliRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetId } = await context.params;
  if (!isUuid(targetId)) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled boolean is required" }, { status: 400 });
  }

  const [record] = await db
    .select({ id: targets.id })
    .from(targets)
    .innerJoin(projects, eq(targets.projectId, projects.id))
    .where(and(eq(targets.id, targetId), eq(projects.userId, user.id)))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  await db
    .update(targets)
    .set({ enabled: body.enabled, updatedAt: new Date() })
    .where(eq(targets.id, targetId));

  return NextResponse.json({ ok: true, enabled: body.enabled });
}
