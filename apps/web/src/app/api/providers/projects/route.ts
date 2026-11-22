import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects as dbProjects, targets } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";

export interface ProviderProjectOption {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  projectType: string;
  owner: string | null;
  isOrg: boolean;
  iconUrl: string | null;
}

interface ModrinthUser {
  id: string;
  username: string;
}

interface ModrinthProject {
  id: string;
  slug: string;
  title?: string;
  name?: string;
  description?: string | null;
  summary?: string | null;
  project_type?: string;
  project_types?: string[];
  organization?: string | null;
  icon_url?: string | null;
}

interface ModrinthOrg {
  id: string;
  slug: string;
  name: string;
}

interface HangarAuthResponse {
  token: string;
}

interface HangarProjectsResponse {
  result: {
    name: string;
    description: string | null;
    avatarUrl?: string | null;
    namespace: {
      owner: string;
      slug: string;
    };
  }[];
}

function decodeJwtSub(jwt: string): string | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    token?: string;
    targetId?: string;
  };

  const kind = body.kind;
  let token = body.token?.trim();

  if (kind !== "modrinth" && kind !== "hangar") {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  if (!token && body.targetId) {
    const [record] = await db
      .select({ encryptedToken: targets.encryptedToken })
      .from(targets)
      .innerJoin(dbProjects, eq(targets.projectId, dbProjects.id))
      .where(and(eq(targets.id, body.targetId), eq(dbProjects.userId, user.id)))
      .limit(1);
    if (record) {
      token = decryptSecret(record.encryptedToken);
    }
  }

  if (!token) {
    return NextResponse.json({ error: "API token is required" }, { status: 400 });
  }

  try {
    if (kind === "modrinth") {
      const headers = {
        Authorization: token,
        "User-Agent": "comet-web/0.1.0",
      };

      const userResp = await fetch("https://api.modrinth.com/v2/user", {
        headers,
        cache: "no-store",
      });

      if (userResp.status === 401 || userResp.status === 403) {
        return NextResponse.json(
          { error: "Invalid Modrinth token or missing Read user data / Read projects scope" },
          { status: 401 },
        );
      }
      if (!userResp.ok) {
        return NextResponse.json(
          { error: `Modrinth API error (${userResp.status})` },
          { status: 502 },
        );
      }

      const mrUser = (await userResp.json()) as ModrinthUser;

      const [userProjectsResp, orgsResp] = await Promise.all([
        fetch(`https://api.modrinth.com/v2/user/${mrUser.id}/projects`, {
          headers,
          cache: "no-store",
        }),
        fetch(`https://api.modrinth.com/v3/user/${mrUser.id}/organizations`, {
          headers,
          cache: "no-store",
        }).catch(() => null),
      ]);

      const projectMap = new Map<string, ProviderProjectOption>();
      const orgNameById = new Map<string, string>();
      let orgs: ModrinthOrg[] = [];

      if (orgsResp?.ok) {
        orgs = (await orgsResp.json().catch(() => [])) as ModrinthOrg[];
        for (const org of orgs) {
          orgNameById.set(org.id, org.name);
        }
      }

      if (userProjectsResp.ok) {
        const raw = (await userProjectsResp.json()) as ModrinthProject[];
        for (const p of raw) {
          const orgName = p.organization ? (orgNameById.get(p.organization) ?? null) : null;
          projectMap.set(p.id, {
            id: p.id,
            slug: p.slug,
            title: p.title ?? p.name ?? p.slug,
            description: p.description ?? p.summary ?? null,
            projectType: p.project_type ?? p.project_types?.[0] ?? "project",
            owner: orgName ?? mrUser.username,
            isOrg: Boolean(orgName),
            iconUrl: p.icon_url ?? null,
          });
        }
      }

      if (orgs.length > 0) {
        const orgProjectLists = await Promise.all(
          orgs.map(async (org) => {
            const resp = await fetch(
              `https://api.modrinth.com/v3/organization/${org.id}/projects`,
              { headers, cache: "no-store" },
            ).catch(() => null);
            if (!resp?.ok) return [];
            const raw = (await resp.json().catch(() => [])) as ModrinthProject[];
            return raw.map((p) => ({ org, p }));
          }),
        );

        for (const list of orgProjectLists) {
          for (const { org, p } of list) {
            projectMap.set(p.id, {
              id: p.id,
              slug: p.slug,
              title: p.title ?? p.name ?? p.slug,
              description: p.description ?? p.summary ?? null,
              projectType: p.project_type ?? p.project_types?.[0] ?? "project",
              owner: org.name,
              isOrg: true,
              iconUrl: p.icon_url ?? null,
            });
          }
        }
      }

      if (!userProjectsResp.ok && projectMap.size === 0) {
        return NextResponse.json(
          { error: "Failed to load Modrinth projects (check Read projects permission)" },
          { status: 502 },
        );
      }

      return NextResponse.json({
        projects: Array.from(projectMap.values()),
        account: mrUser.username,
      });
    }

    const authResp = await fetch(
      `https://hangar.papermc.io/api/v1/authenticate?apiKey=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "User-Agent": "comet-web/0.1.0" },
        cache: "no-store",
      },
    );

    if (authResp.status === 400 || authResp.status === 401 || authResp.status === 403) {
      return NextResponse.json({ error: "Invalid Hangar API key" }, { status: 401 });
    }
    if (!authResp.ok) {
      return NextResponse.json(
        { error: `Hangar authentication error (${authResp.status})` },
        { status: 502 },
      );
    }

    const { token: jwt } = (await authResp.json()) as HangarAuthResponse;
    const hangarUser = decodeJwtSub(jwt);
    if (!hangarUser) {
      return NextResponse.json({ error: "Could not resolve Hangar account" }, { status: 502 });
    }

    const hangarHeaders = {
      Authorization: `HangarAuth ${jwt}`,
      "User-Agent": "comet-web/0.1.0",
    };

    const [memberResp, orgsResp] = await Promise.all([
      fetch(
        `https://hangar.papermc.io/api/v1/projects?member=${encodeURIComponent(hangarUser)}&limit=50`,
        { headers: hangarHeaders, cache: "no-store" },
      ),
      fetch(
        `https://hangar.papermc.io/api/v1/users/${encodeURIComponent(hangarUser)}/organizations`,
        { headers: hangarHeaders, cache: "no-store" },
      ).catch(() => null),
    ]);

    const projectMap = new Map<string, ProviderProjectOption>();

    if (memberResp.ok) {
      const raw = (await memberResp.json()) as HangarProjectsResponse;
      for (const p of raw.result) {
        const key = `${p.namespace.owner}/${p.namespace.slug}`;
        projectMap.set(key, {
          id: key,
          slug: key,
          title: p.name,
          description: p.description,
          projectType: "plugin",
          owner: p.namespace.owner,
          isOrg: p.namespace.owner.toLowerCase() !== hangarUser.toLowerCase(),
          iconUrl: p.avatarUrl ?? null,
        });
      }
    }

    if (orgsResp?.ok) {
      const orgsData = (await orgsResp.json().catch(() => ({}))) as Record<string, unknown>;
      const orgNames = Object.keys(orgsData);
      const orgLists = await Promise.all(
        orgNames.map(async (orgName) => {
          const resp = await fetch(
            `https://hangar.papermc.io/api/v1/projects?owner=${encodeURIComponent(orgName)}&limit=50`,
            { headers: hangarHeaders, cache: "no-store" },
          ).catch(() => null);
          if (!resp?.ok) return [];
          const data = (await resp.json().catch(() => ({ result: [] }))) as HangarProjectsResponse;
          return data.result;
        }),
      );

      for (const list of orgLists) {
        for (const p of list) {
          const key = `${p.namespace.owner}/${p.namespace.slug}`;
          projectMap.set(key, {
            id: key,
            slug: key,
            title: p.name,
            description: p.description,
            projectType: "plugin",
            owner: p.namespace.owner,
            isOrg: true,
            iconUrl: p.avatarUrl ?? null,
          });
        }
      }
    }

    if (!memberResp.ok && projectMap.size === 0) {
      return NextResponse.json(
        { error: "Failed to load Hangar projects" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      projects: Array.from(projectMap.values()),
      account: hangarUser,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach platform API" },
      { status: 502 },
    );
  }
}
