export interface GitHubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updatedAt: string;
}

export interface GitHubReleaseSummary {
  id: number;
  tagName: string;
  name: string;
  prerelease: boolean;
  publishedAt: string | null;
  htmlUrl: string;
  assets: {
    name: string;
    size: number;
  }[];
}

interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updated_at: string;
}

interface RawGitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  prerelease: boolean;
  published_at: string | null;
  html_url: string;
  assets: {
    name: string;
    size: number;
  }[];
}

export async function fetchUserRepos(token: string): Promise<GitHubRepoSummary[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  const [reposResp, orgsResp] = await Promise.all([
    fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
      { headers, cache: "no-store" },
    ),
    fetch("https://api.github.com/user/orgs?per_page=50", {
      headers,
      cache: "no-store",
    }).catch(() => null),
  ]);

  if (!reposResp.ok) {
    throw new Error(`GitHub API error (${reposResp.status})`);
  }

  const repoMap = new Map<string, GitHubRepoSummary>();
  const raw = (await reposResp.json()) as RawGitHubRepo[];
  for (const r of raw) {
    repoMap.set(r.full_name.toLowerCase(), {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      private: r.private,
      language: r.language,
      updatedAt: r.updated_at,
    });
  }

  if (orgsResp?.ok) {
    const orgs = (await orgsResp.json().catch(() => [])) as { login: string }[];
    const orgRepoLists = await Promise.all(
      orgs.map(async (org) => {
        const resp = await fetch(
          `https://api.github.com/orgs/${encodeURIComponent(org.login)}/repos?sort=updated&per_page=100`,
          { headers, cache: "no-store" },
        ).catch(() => null);
        if (!resp?.ok) return [];
        return (await resp.json().catch(() => [])) as RawGitHubRepo[];
      }),
    );

    for (const list of orgRepoLists) {
      for (const r of list) {
        repoMap.set(r.full_name.toLowerCase(), {
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          private: r.private,
          language: r.language,
          updatedAt: r.updated_at,
        });
      }
    }
  }

  return Array.from(repoMap.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function fetchRepoReleases(
  repoFullName: string,
  token?: string | null,
): Promise<GitHubReleaseSummary[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(
    `https://api.github.com/repos/${repoFullName}/releases?per_page=5`,
    { headers, cache: "no-store" },
  );

  if (resp.status === 404) {
    return [];
  }
  if (!resp.ok) {
    throw new Error(`GitHub API error (${resp.status})`);
  }

  const raw = (await resp.json()) as RawGitHubRelease[];
  return raw.map((rel) => ({
    id: rel.id,
    tagName: rel.tag_name,
    name: rel.name || rel.tag_name,
    prerelease: rel.prerelease,
    publishedAt: rel.published_at,
    htmlUrl: rel.html_url,
    assets: rel.assets.map((a) => ({ name: a.name, size: a.size })),
  }));
}
