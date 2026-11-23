export type BadgeStyle = "card" | "strip" | "pill";

interface PlatformMeta {
  label: string;
  color: string;
  soft: string;
  text: string;
}

const PLATFORM_MAP: Record<string, PlatformMeta> = {
  modrinth: {
    label: "Modrinth",
    color: "#1bd96a",
    soft: "rgba(27,217,106,0.12)",
    text: "#6ee7b7",
  },
  hangar: {
    label: "Hangar",
    color: "#3b82f6",
    soft: "rgba(59,130,246,0.14)",
    text: "#9cc4ff",
  },
  curseforge: {
    label: "CurseForge",
    color: "#f16436",
    soft: "rgba(241,100,54,0.14)",
    text: "#fdba74",
  },
};

export interface BadgeInput {
  projectName: string;
  version: string | null;
  platforms: string[];
  style: BadgeStyle;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolvePlatforms(kinds: string[]): PlatformMeta[] {
  const seen = new Set<string>();
  const out: PlatformMeta[] = [];
  for (const kind of kinds) {
    const key = kind.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = PLATFORM_MAP[key];
    if (meta) {
      out.push(meta);
    } else if (key.trim()) {
      out.push({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        color: "#9cc4ff",
        soft: "rgba(156,196,255,0.14)",
        text: "#cdeaff",
      });
    }
  }
  return out;
}

export function parseBadgeStyle(raw: string | null): BadgeStyle {
  if (raw === "strip" || raw === "pill" || raw === "card") {
    return raw;
  }
  return "card";
}

export function renderBadgeSvg(input: BadgeInput): string {
  const name = input.projectName.trim() || "Comet";
  const plats = resolvePlatforms(input.platforms);
  const ver = input.version?.trim() || null;

  if (input.style === "pill") {
    return renderPillSvg(ver, plats);
  }
  if (input.style === "strip") {
    return renderStripSvg(name, ver, plats);
  }
  return renderCardSvg(name, ver, plats);
}

function renderCardSvg(name: string, ver: string | null, plats: PlatformMeta[]): string {
  const w = 396;
  const h = 88;
  const verText = ver ?? "unreleased";
  const verW = Math.max(54, verText.length * 7.4 + 18);

  let platItems = "";
  let px = 18;
  if (plats.length === 0) {
    platItems = `<text x="18" y="67" fill="#66657a" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="11.5">No releases published via Comet yet</text>`;
  } else {
    for (const p of plats) {
      const itemW = p.label.length * 6.9 + 20;
      platItems += `<g transform="translate(${px}, 54)"><circle cx="4" cy="9" r="3" fill="${p.color}"/><text x="12" y="13" fill="#d6d7e6" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="12" font-weight="500">${escapeXml(p.label)}</text></g>`;
      px += itemW + 8;
    }
  }

  const verFill = ver ? "rgba(26,109,255,0.2)" : "rgba(255,255,255,0.06)";
  const verStroke = ver ? "rgba(156,196,255,0.32)" : "rgba(255,255,255,0.1)";
  const verColor = ver ? "#cdeaff" : "#9897ad";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(name)} ${escapeXml(verText)}">
  <rect width="${w}" height="${h}" rx="14" fill="#111016" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>
  <g transform="translate(18, 17)">
    <rect width="22" height="22" rx="6.5" fill="#1a6dff"/>
    <path d="M7.5 14.5 L14.5 7.5 M10.5 7.5 H14.5 V11.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <text x="31" y="16" fill="#ffffff" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="14.5" font-weight="700" letter-spacing="-0.015em">${escapeXml(name)}</text>
  </g>
  <g transform="translate(${w - 18 - verW}, 16)">
    <rect width="${verW}" height="24" rx="12" fill="${verFill}" stroke="${verStroke}" stroke-width="1"/>
    <text x="${verW / 2}" y="15.5" text-anchor="middle" fill="${verColor}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11.5" font-weight="600">${escapeXml(verText)}</text>
  </g>
  ${platItems}
  <text x="${w - 18}" y="67" text-anchor="end" fill="#66657a" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="11">via Comet</text>
</svg>`;
}

function renderStripSvg(name: string, ver: string | null, plats: PlatformMeta[]): string {
  const verText = ver ?? "unreleased";
  const verW = Math.max(48, verText.length * 7.2 + 16);
  const nameW = name.length * 7.8;
  const leftW = 34 + nameW + 10 + verW + 12;

  let items = "";
  let rx = leftW + 12;
  for (const p of plats) {
    const iw = p.label.length * 7 + 22;
    items += `<g transform="translate(${rx}, 8)"><rect width="${iw}" height="22" rx="7" fill="${p.soft}"/><circle cx="9" cy="11" r="2.8" fill="${p.color}"/><text x="16.5" y="14.5" fill="${p.text}" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="11" font-weight="600">${escapeXml(p.label)}</text></g>`;
    rx += iw + 6;
  }

  const w = plats.length > 0 ? rx + 6 : leftW + 6;
  const h = 38;
  const verFill = ver ? "rgba(26,109,255,0.22)" : "rgba(255,255,255,0.06)";
  const verStroke = ver ? "rgba(156,196,255,0.28)" : "rgba(255,255,255,0.1)";
  const verColor = ver ? "#cdeaff" : "#9897ad";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(name)} ${escapeXml(verText)}">
  <defs><clipPath id="stripClip"><rect width="${w}" height="${h}" rx="11"/></clipPath></defs>
  <g clip-path="url(#stripClip)">
    <rect width="${w}" height="${h}" fill="#100f15"/>
    <rect width="${leftW}" height="${h}" fill="#181722"/>
    <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10.5" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>
    ${plats.length > 0 ? `<line x1="${leftW}" y1="0" x2="${leftW}" y2="${h}" stroke="rgba(255,255,255,0.08)"/>` : ""}
    <g transform="translate(10, 9)">
      <rect width="20" height="20" rx="6" fill="#1a6dff"/>
      <path d="M6.5 13.5 L13.5 6.5 M9.5 6.5 H13.5 V10.5" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
    <text x="38" y="23" fill="#ffffff" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="12.5" font-weight="700">${escapeXml(name)}</text>
    <g transform="translate(${38 + nameW + 8}, 8)">
      <rect width="${verW}" height="22" rx="7" fill="${verFill}" stroke="${verStroke}" stroke-width="1"/>
      <text x="${verW / 2}" y="14.5" text-anchor="middle" fill="${verColor}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="600">${escapeXml(verText)}</text>
    </g>
    ${items}
  </g>
</svg>`;
}

function renderPillSvg(ver: string | null, plats: PlatformMeta[]): string {
  const rightText = ver
    ? ver + (plats.length > 0 ? ` · ${plats.map((p) => p.label).join(" + ")}` : "")
    : "unreleased";
  const lw = 68;
  const rw = Math.max(104, rightText.length * 6.9 + 24);
  const w = lw + rw;
  const h = 28;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Comet ${escapeXml(rightText)}">
  <rect width="${w}" height="${h}" rx="14" fill="#121116" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <rect width="${lw}" height="${h}" rx="14" fill="#1a6dff"/>
  <rect x="${lw - 14}" width="14" height="${h}" fill="#1a6dff"/>
  <text x="${lw / 2}" y="18" text-anchor="middle" fill="#ffffff" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="11.5" font-weight="700">Comet</text>
  <text x="${lw + rw / 2}" y="18" text-anchor="middle" fill="#e4e4ef" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11.5" font-weight="600">${escapeXml(rightText)}</text>
</svg>`;
}
