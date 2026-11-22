import { NextResponse } from "next/server";

interface ModrinthGameVersion {
  version: string;
  version_type: string;
  major: boolean;
}

interface ModrinthLoader {
  name: string;
  supported_project_types: string[];
}

const FALLBACK_VERSIONS = [
  "1.21.5",
  "1.21.4",
  "1.21.3",
  "1.21.2",
  "1.21.1",
  "1.21",
  "1.20.6",
  "1.20.5",
  "1.20.4",
  "1.20.3",
  "1.20.2",
  "1.20.1",
  "1.20",
];

const FALLBACK_PLUGIN_LOADERS = [
  "paper",
  "purpur",
  "spigot",
  "bukkit",
  "folia",
  "velocity",
  "waterfall",
  "bungeecord",
  "sponge",
];

const FALLBACK_MOD_LOADERS = [
  "fabric",
  "neoforge",
  "forge",
  "quilt",
  "liteloader",
  "rift",
];

function isAtLeast120(version: string): boolean {
  const parts = version.split(".").map((n) => Number.parseInt(n, 10));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return false;
  }
  if (parts[0] >= 2) return true;
  return parts[0] === 1 && parts[1] >= 20;
}

export async function GET() {
  try {
    const [versionsResp, loadersResp] = await Promise.all([
      fetch("https://api.modrinth.com/v2/tag/game_version", {
        headers: { "User-Agent": "comet-web/0.1.0" },
        next: { revalidate: 3600 },
      }),
      fetch("https://api.modrinth.com/v2/tag/loader", {
        headers: { "User-Agent": "comet-web/0.1.0" },
        next: { revalidate: 3600 },
      }),
    ]);

    let gameVersions = FALLBACK_VERSIONS;
    if (versionsResp.ok) {
      const rawVersions = (await versionsResp.json()) as ModrinthGameVersion[];
      const releases = rawVersions
        .filter((v) => v.version_type === "release")
        .map((v) => v.version);

      const idx120 = releases.indexOf("1.20");
      if (idx120 >= 0) {
        gameVersions = releases.slice(0, idx120 + 1);
      } else {
        const filtered = releases.filter(isAtLeast120);
        if (filtered.length > 0) gameVersions = filtered;
      }
    }

    let pluginLoaders = FALLBACK_PLUGIN_LOADERS;
    let modLoaders = FALLBACK_MOD_LOADERS;
    if (loadersResp.ok) {
      const rawLoaders = (await loadersResp.json()) as ModrinthLoader[];
      const plugins = rawLoaders
        .filter((l) => l.supported_project_types.includes("plugin"))
        .map((l) => l.name);
      const mods = rawLoaders
        .filter((l) => l.supported_project_types.includes("mod"))
        .map((l) => l.name);

      if (plugins.length > 0) pluginLoaders = plugins;
      if (mods.length > 0) modLoaders = mods;
    }

    return NextResponse.json({
      gameVersions,
      loaders: {
        plugins: pluginLoaders,
        mods: modLoaders,
      },
    });
  } catch {
    return NextResponse.json({
      gameVersions: FALLBACK_VERSIONS,
      loaders: {
        plugins: FALLBACK_PLUGIN_LOADERS,
        mods: FALLBACK_MOD_LOADERS,
      },
    });
  }
}
