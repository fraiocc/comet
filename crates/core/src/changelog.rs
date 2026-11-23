use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct CommitEntry {
    pub sha: String,
    pub subject: String,
    pub body: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommitKind {
    Feat,
    Fix,
    Perf,
    Refactor,
    Docs,
    Chore,
    Other,
}

#[derive(Debug, Clone)]
pub struct ParsedCommit {
    pub kind: CommitKind,
    pub scope: Option<String>,
    pub description: String,
    pub short_sha: String,
    pub breaking: bool,
}

pub fn parse_commit(entry: &CommitEntry) -> ParsedCommit {
    let short_sha = entry.sha.chars().take(7).collect::<String>();
    let subject = entry.subject.trim();
    let body_breaking =
        entry.body.contains("BREAKING CHANGE:") || entry.body.contains("BREAKING-CHANGE:");

    if let Some((prefix, rest)) = subject.split_once(": ") {
        let (prefix_no_bang, bang) = match prefix.strip_suffix('!') {
            Some(stripped) => (stripped, true),
            None => (prefix, false),
        };

        let (raw_type, scope) = if let Some(open) = prefix_no_bang.find('(')
            && let Some(stripped) = prefix_no_bang.strip_suffix(')')
        {
            let ty = &stripped[..open];
            let sc = stripped[open + 1..].trim();
            let scope = if sc.is_empty() {
                None
            } else {
                Some(sc.to_string())
            };
            (ty, scope)
        } else {
            (prefix_no_bang, None)
        };

        let kind = match raw_type.trim().to_ascii_lowercase().as_str() {
            "feat" | "feature" => CommitKind::Feat,
            "fix" | "bugfix" => CommitKind::Fix,
            "perf" => CommitKind::Perf,
            "refactor" => CommitKind::Refactor,
            "docs" | "doc" => CommitKind::Docs,
            "chore" | "ci" | "build" | "style" | "test" => CommitKind::Chore,
            _ => CommitKind::Other,
        };

        return ParsedCommit {
            kind,
            scope,
            description: rest.trim().to_string(),
            short_sha,
            breaking: bang || body_breaking,
        };
    }

    ParsedCommit {
        kind: CommitKind::Other,
        scope: None,
        description: subject.to_string(),
        short_sha,
        breaking: body_breaking,
    }
}

pub fn is_noise_commit(subject: &str) -> bool {
    let lower = subject.trim().to_ascii_lowercase();
    lower.starts_with("merge pull request ")
        || lower.starts_with("merge branch ")
        || lower.starts_with("merge remote-tracking branch ")
        || lower.starts_with("chore: release v")
        || lower.starts_with("chore(release):")
}

pub fn render_markdown(
    commits: &[CommitEntry],
    heading: Option<&str>,
    include_chores: bool,
) -> String {
    let mut breaking = Vec::new();
    let mut feats = Vec::new();
    let mut fixes = Vec::new();
    let mut perf = Vec::new();
    let mut refactors = Vec::new();
    let mut docs = Vec::new();
    let mut others = Vec::new();

    for entry in commits {
        if !include_chores && is_noise_commit(&entry.subject) {
            continue;
        }
        let parsed = parse_commit(entry);
        if parsed.breaking {
            breaking.push(parsed.clone());
        }
        match parsed.kind {
            CommitKind::Feat => feats.push(parsed),
            CommitKind::Fix => fixes.push(parsed),
            CommitKind::Perf => perf.push(parsed),
            CommitKind::Refactor => refactors.push(parsed),
            CommitKind::Docs => docs.push(parsed),
            CommitKind::Chore => {
                if include_chores {
                    others.push(parsed);
                }
            }
            CommitKind::Other => others.push(parsed),
        }
    }

    let mut sections: Vec<(&str, &[ParsedCommit])> = Vec::new();
    if !breaking.is_empty() {
        sections.push(("Breaking Changes", &breaking));
    }
    if !feats.is_empty() {
        sections.push(("Features", &feats));
    }
    if !fixes.is_empty() {
        sections.push(("Fixes", &fixes));
    }
    if !perf.is_empty() {
        sections.push(("Performance", &perf));
    }
    if !refactors.is_empty() {
        sections.push(("Refactoring", &refactors));
    }
    if !docs.is_empty() {
        sections.push(("Documentation", &docs));
    }
    if !others.is_empty() {
        sections.push(("Other Changes", &others));
    }

    let mut out = String::new();
    if let Some(title) = heading
        && !title.trim().is_empty()
    {
        out.push_str(&format!("## {}\n\n", title.trim()));
    }

    for (idx, (name, items)) in sections.iter().enumerate() {
        if idx > 0 {
            out.push('\n');
        }
        out.push_str(&format!("### {name}\n"));
        for item in *items {
            let line = match &item.scope {
                Some(scope) => format!(
                    "- **{scope}:** {} (`{}`)\n",
                    item.description, item.short_sha
                ),
                None => format!("- {} (`{}`)\n", item.description, item.short_sha),
            };
            out.push_str(&line);
        }
    }

    out.trim_end().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn commit(sha: &str, subject: &str, body: &str) -> CommitEntry {
        CommitEntry {
            sha: sha.to_string(),
            subject: subject.to_string(),
            body: body.to_string(),
        }
    }

    #[test]
    fn parses_scoped_and_breaking_conventional_commits() {
        let c = parse_commit(&commit(
            "abcdef123456",
            "feat(cli)!: add local file publish",
            "",
        ));
        assert_eq!(c.kind, CommitKind::Feat);
        assert_eq!(c.scope.as_deref(), Some("cli"));
        assert_eq!(c.description, "add local file publish");
        assert_eq!(c.short_sha, "abcdef1");
        assert!(c.breaking);
    }

    #[test]
    fn renders_grouped_markdown_and_filters_noise() {
        let entries = vec![
            commit("1111111aaa", "feat(core): add retry backoff", ""),
            commit("2222222bbb", "fix(github): fallback on 401", ""),
            commit("3333333ccc", "chore: release v0.4.2", ""),
            commit("4444444ddd", "Merge pull request #12 from org/branch", ""),
        ];

        let md = render_markdown(&entries, Some("v0.5.0"), false);
        assert!(md.contains("## v0.5.0"));
        assert!(md.contains("### Features"));
        assert!(md.contains("- **core:** add retry backoff (`1111111`)"));
        assert!(md.contains("### Fixes"));
        assert!(md.contains("- **github:** fallback on 401 (`2222222`)"));
        assert!(!md.contains("release v0.4.2"));
        assert!(!md.contains("Merge pull request"));
    }

    #[test]
    fn detects_body_breaking_change() {
        let c = parse_commit(&commit(
            "9999999",
            "refactor(api): rename field",
            "BREAKING CHANGE: old field removed",
        ));
        assert!(c.breaking);
        assert_eq!(c.kind, CommitKind::Refactor);
    }
}
