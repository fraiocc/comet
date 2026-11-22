import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  return NextResponse.json({ projects: list });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    repoFullName?: string;
    displayName?: string;
    assetPattern?: string;
  };

  const repoFullName = body.repoFullName?.trim();
  const displayName = body.displayName?.trim();
  const assetPattern = body.assetPattern?.trim() || "*.jar";

  if (!repoFullName || !repoFullName.includes("/")) {
    return NextResponse.json({ error: "repoFullName must be owner/repo" }, { status: 400 });
  }

  const [created] = await db
    .insert(projects)
    .values({
      userId: user.id,
      repoFullName,
      displayName: displayName || repoFullName,
      assetPattern,
    })
    .returning();

  return NextResponse.json({ project: created }, { status: 201 });
}
