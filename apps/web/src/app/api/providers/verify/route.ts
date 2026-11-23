import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { APP_VERSION } from "@/lib/version";

const WEB_USER_AGENT = `comet-web/${APP_VERSION}`;

interface ModrinthUser {
  id: string;
  username: string;
}

interface ModrinthProject {
  id: string;
  title: string;
}

interface ModrinthMember {
  user: {
    id: string;
  };
}

interface HangarAuthResponse {
  token: string;
}

interface HangarProject {
  name: string;
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
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    token?: string;
    externalProjectId?: string;
  };

  const kind = body.kind;
  const token = body.token?.trim();
  const externalProjectId = body.externalProjectId?.trim();

  if (kind !== "modrinth" && kind !== "hangar" && kind !== "curseforge") {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }
  if (!token || !externalProjectId) {
    return NextResponse.json(
      { error: "API token and project ID are required" },
      { status: 400 },
    );
  }

  try {
    if (kind === "modrinth") {
      const headers = {
        Authorization: token,
        "User-Agent": WEB_USER_AGENT,
      };

      const userResp = await fetch("https://api.modrinth.com/v2/user", {
        headers,
        cache: "no-store",
      });

      if (!userResp.ok) {
        return NextResponse.json(
          { error: "Modrinth API token is invalid or expired" },
          { status: 401 },
        );
      }

      const mrUser = (await userResp.json()) as ModrinthUser;

      const projectResp = await fetch(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(externalProjectId)}`,
        { headers, cache: "no-store" },
      );

      if (projectResp.status === 404) {
        return NextResponse.json(
          { error: `Modrinth project '${externalProjectId}' was not found` },
          { status: 404 },
        );
      }
      if (!projectResp.ok) {
        return NextResponse.json(
          { error: "Cannot access this Modrinth project with the provided token" },
          { status: 403 },
        );
      }

      const project = (await projectResp.json()) as ModrinthProject;

      const membersResp = await fetch(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(project.id)}/members`,
        { headers, cache: "no-store" },
      );

      if (membersResp.ok) {
        const members = (await membersResp.json()) as ModrinthMember[];
        let hasAccess = members.some((m) => m.user.id === mrUser.id);

        if (!hasAccess) {
          const [v3ProjResp, orgsResp] = await Promise.all([
            fetch(`https://api.modrinth.com/v3/project/${encodeURIComponent(project.id)}`, {
              headers,
              cache: "no-store",
            }).catch(() => null),
            fetch(`https://api.modrinth.com/v3/user/${mrUser.id}/organizations`, {
              headers,
              cache: "no-store",
            }).catch(() => null),
          ]);
          if (v3ProjResp?.ok && orgsResp?.ok) {
            const v3Proj = (await v3ProjResp.json().catch(() => ({}))) as {
              organization?: string | null;
            };
            const orgs = (await orgsResp.json().catch(() => [])) as { id: string }[];
            if (v3Proj.organization && orgs.some((o) => o.id === v3Proj.organization)) {
              hasAccess = true;
            }
          }
        }

        if (!hasAccess) {
          return NextResponse.json(
            { error: `Account '${mrUser.username}' does not have publish access to '${project.title}'` },
            { status: 403 },
          );
        }
      }

      return NextResponse.json({
        ok: true,
        projectTitle: project.title,
        username: mrUser.username,
      });
    }

    if (kind === "curseforge") {
      if (!/^\d+$/.test(externalProjectId)) {
        return NextResponse.json(
          { error: "CurseForge project ID must be numeric (e.g. 238222)" },
          { status: 400 },
        );
      }

      const cfResp = await fetch("https://minecraft.curseforge.com/api/game/versions", {
        headers: {
          "X-Api-Token": token,
          "User-Agent": "comet-web",
        },
        cache: "no-store",
      });

      if (!cfResp.ok) {
        return NextResponse.json(
          { error: "CurseForge API token is invalid or expired" },
          { status: 401 },
        );
      }

      return NextResponse.json({
        ok: true,
        projectTitle: `CurseForge #${externalProjectId}`,
        username: "curseforge",
      });
    }

    const authResp = await fetch(
      `https://hangar.papermc.io/api/v1/authenticate?apiKey=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "User-Agent": WEB_USER_AGENT },
        cache: "no-store",
      },
    );

    if (!authResp.ok) {
      return NextResponse.json(
        { error: "Hangar API key is invalid or expired" },
        { status: 401 },
      );
    }

    const { token: jwt } = (await authResp.json()) as HangarAuthResponse;
    const hangarUser = decodeJwtSub(jwt) ?? "hangar";

    const projectResp = await fetch(
      `https://hangar.papermc.io/api/v1/projects/${externalProjectId}`,
      {
        headers: {
          Authorization: `HangarAuth ${jwt}`,
          "User-Agent": WEB_USER_AGENT,
        },
        cache: "no-store",
      },
    );

    if (projectResp.status === 404) {
      return NextResponse.json(
        { error: `Hangar project '${externalProjectId}' was not found` },
        { status: 404 },
      );
    }
    if (!projectResp.ok) {
      return NextResponse.json(
        { error: "Cannot access this Hangar project with the provided API key" },
        { status: 403 },
      );
    }

    const project = (await projectResp.json()) as HangarProject;
    return NextResponse.json({
      ok: true,
      projectTitle: project.name,
      username: hangarUser,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach platform API to verify credentials" },
      { status: 502 },
    );
  }
}
