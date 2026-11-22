import type { PublishResultItem } from "@/db/schema";

const WEBHOOK_PREFIXES = [
  "https://discord.com/api/webhooks/",
  "https://discordapp.com/api/webhooks/",
  "https://ptb.discord.com/api/webhooks/",
  "https://canary.discord.com/api/webhooks/",
];

export function isValidDiscordWebhookUrl(url: string): boolean {
  const trimmed = url.trim();
  return WEBHOOK_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) && trimmed.length > 50;
}

interface ReleaseWebhookPayload {
  webhookUrl: string;
  projectName: string;
  repoFullName: string;
  releaseTag: string;
  assetName: string;
  results: PublishResultItem[];
}

export async function sendDiscordReleaseEmbed(payload: ReleaseWebhookPayload): Promise<boolean> {
  if (!isValidDiscordWebhookUrl(payload.webhookUrl)) return false;

  const succeeded = payload.results.filter((r) => r.status === "success");
  if (succeeded.length === 0) return false;

  const targetLines = payload.results.map((item) => {
    const label = item.kind.charAt(0).toUpperCase() + item.kind.slice(1);
    if (item.status === "success") {
      return item.url ? `**${label}** — [View release](${item.url})` : `**${label}** — Published`;
    }
    return `**${label}** — Failed`;
  });

  const embed = {
    title: `${payload.projectName} ${payload.releaseTag} released`,
    url: `https://github.com/${payload.repoFullName}/releases/tag/${encodeURIComponent(payload.releaseTag)}`,
    color: 0x1a6dff,
    fields: [
      { name: "Artifact", value: `\`${payload.assetName}\``, inline: true },
      { name: "Repository", value: `\`${payload.repoFullName}\``, inline: true },
      { name: "Targets", value: targetLines.join("\n"), inline: false },
    ],
    footer: { text: "Published with Comet · comet.fraio.cc" },
    timestamp: new Date().toISOString(),
  };

  try {
    const resp = await fetch(payload.webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Comet",
        embeds: [embed],
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function sendDiscordTestEmbed(
  webhookUrl: string,
  projectName: string,
  repoFullName: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidDiscordWebhookUrl(webhookUrl)) {
    return { ok: false, error: "Invalid Discord webhook URL" };
  }

  try {
    const resp = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Comet",
        embeds: [
          {
            title: `${projectName} webhook connected`,
            description: `Release notifications for \`${repoFullName}\` will be posted to this channel.`,
            color: 0x1a6dff,
            footer: { text: "Comet · comet.fraio.cc" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!resp.ok) {
      return { ok: false, error: `Discord returned HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to reach Discord webhook" };
  }
}
