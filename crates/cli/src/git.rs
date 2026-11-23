use std::process::Command;

pub fn detect_github_repo() -> Option<String> {
    let output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8(output.stdout).ok()?;
    parse_github_remote(raw.trim())
}

pub fn parse_github_remote(remote: &str) -> Option<String> {
    let trimmed = remote.trim().trim_end_matches(".git").trim_end_matches('/');

    let path = if let Some(rest) = trimmed.strip_prefix("git@github.com:") {
        rest
    } else if let Some(idx) = trimmed.find("github.com/") {
        &trimmed[idx + "github.com/".len()..]
    } else {
        return None;
    };

    let mut parts = path.split('/');
    let owner = parts.next()?.trim();
    let repo = parts.next()?.trim();
    if owner.is_empty() || repo.is_empty() || parts.next().is_some() {
        return None;
    }

    Some(format!("{owner}/{repo}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_https_and_ssh_remotes() {
        assert_eq!(
            parse_github_remote("https://github.com/fraiocc/comet.git"),
            Some("fraiocc/comet".to_string())
        );
        assert_eq!(
            parse_github_remote("git@github.com:fraiocc/comet.git"),
            Some("fraiocc/comet".to_string())
        );
        assert_eq!(
            parse_github_remote("https://github.com/fraiocc/comet/"),
            Some("fraiocc/comet".to_string())
        );
        assert_eq!(parse_github_remote("https://gitlab.com/a/b.git"), None);
    }
}
