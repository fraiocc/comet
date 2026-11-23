import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, targets, type TargetDependency } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { APP_VERSION } from "@/lib/version";

const WEB_USER_AGENT = `comet-web/${APP_VERSION}`;

interface ModrinthVersion {
  version_number: string;
  dependencies: {
    project_id?: string | null;
    dependency_type: "required" | "optional" | "incompatible" | "embedded";
  }[];
}

interface ModrinthProjectSummary {
  id: string;
  title: string;
}

interface HangarVersionsResponse {
  result: {
    name: string;
    pluginDependencies: Record<
      string,
      {
        name: string;
        required: boolean;
        externalUrl?: string | null;
      }[]
    >;
  }[];
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    externalProjectId?: string;
    token?: string;
    targetId?: string;
  };

  const kind = body.kind;
  const externalProjectId = body.externalProjectId?.trim();
  let resolvedToken = body.token?.trim() || null;

  if (kind !== "modrinth" && kind !== "hangar") {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }
  if (!externalProjectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  if (!resolvedToken && body.targetId) {
    const [record] = await db
      .select({ encryptedToken: targets.encryptedToken })
      .from(targets)
      .innerJoin(projects, eq(targets.projectId, projects.id))
      .where(and(eq(targets.id, body.targetId), eq(projects.userId, user.id)))
      .limit(1);
    if (record) {
      resolvedToken = decryptSecret(record.encryptedToken);
    }
  }

  try {
    if (kind === "modrinth") {
      const headers: Record<string, string> = { "User-Agent": WEB_USER_AGENT };
      if (resolvedToken) headers.Authorization = resolvedToken;

      const versionsResp = await fetch(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(externalProjectId)}/version`,
        { headers, cache: "no-store" },
      );

      if (!versionsResp.ok) {
        return NextResponse.json(
          { error: "Could not load versions from Modrinth" },
          { status: 502 },
        );
      }

      const versions = (await versionsResp.json()) as ModrinthVersion[];
      const latest = versions[0];
      if (!latest) {
        return NextResponse.json({ dependencies: [], versionNumber: null });
      }

      const rawDeps = latest.dependencies.filter((d): d is { project_id: string; dependency_type: TargetDependency["dependencyType"] } =>
        Boolean(d.project_id),
      );

      const titleById = new Map<string, string>();
      if (rawDeps.length > 0) {
        const idsParam = encodeURIComponent(JSON.stringify(rawDeps.map((d) => d.project_id)));
        const metaResp = await fetch(
          `https://api.modrinth.com/v2/projects?ids=${idsParam}`,
          { headers, cache: "no-store" },
        ).catch(() => null);
        if (metaResp?.ok) {
          const list = (await metaResp.json().catch(() => [])) as ModrinthProjectSummary[];
          for (const item of list) {
            titleById.set(item.id, item.title);
          }
        }
      }

      const dedup = new Map<string, TargetDependency>();
      for (const dep of rawDeps) {
        dedup.set(dep.project_id, {
          projectId: dep.project_id,
          name: titleById.get(dep.project_id) ?? dep.project_id,
          dependencyType: dep.dependency_type,
        });
      }

      return NextResponse.json({
        dependencies: Array.from(dedup.values()),
        versionNumber: latest.version_number,
      });
    }

    const headers: Record<string, string> = { "User-Agent": WEB_USER_AGENT };
    if (resolvedToken) {
      const authResp = await fetch(
        `https://hangar.papermc.io/api/v1/authenticate?apiKey=${encodeURIComponent(resolvedToken)}`,
        { method: "POST", headers, cache: "no-store" },
      ).catch(() => null);
      if (authResp?.ok) {
        const { token: jwt } = (await authResp.json()) as { token: string };
        headers.Authorization = `HangarAuth ${jwt}`;
      }
    }

    const versionsResp = await fetch(
      `https://hangar.papermc.io/api/v1/projects/${externalProjectId}/versions?limit=1`,
      { headers, cache: "no-store" },
    );

    if (!versionsResp.ok) {
      return NextResponse.json(
        { error: "Could not load versions from Hangar" },
        { status: 502 },
      );
    }

    const data = (await versionsResp.json()) as HangarVersionsResponse;
    const latest = data.result[0];
    if (!latest) {
      return NextResponse.json({ dependencies: [], versionNumber: null });
    }

    const dedup = new Map<string, TargetDependency>();
    for (const platformDeps of Object.values(latest.pluginDependencies ?? {})) {
      for (const dep of platformDeps) {
        dedup.set(dep.name.toLowerCase(), {
          projectId: dep.name,
          name: dep.name,
          dependencyType: dep.required ? "required" : "optional",
          externalUrl: dep.externalUrl ?? null,
        });
      }
    }

    return NextResponse.json({
      dependencies: Array.from(dedup.values()),
      versionNumber: latest.name,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach platform API" },
      { status: 502 },
    );
  }
}
