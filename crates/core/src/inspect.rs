use std::collections::BTreeSet;
use std::io::{Cursor, Read};

use serde::Serialize;
use sha2::{Digest, Sha256};
use zip::ZipArchive;

use crate::error::{CometError, Result};

#[derive(Debug, Clone, Serialize)]
pub struct ArtifactMetadata {
    pub file_name: String,
    pub size_bytes: u64,
    pub sha256: String,
    pub loaders: Vec<String>,
    pub id: Option<String>,
    pub name: Option<String>,
    pub version: Option<String>,
    pub description: Option<String>,
    pub api_version: Option<String>,
    pub authors: Vec<String>,
    pub dependencies: Vec<String>,
    pub descriptors_found: Vec<String>,
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut out = String::with_capacity(digest.len() * 2);
    for byte in digest {
        use std::fmt::Write;
        let _ = write!(&mut out, "{byte:02x}");
    }
    out
}

pub fn inspect_jar_bytes(file_name: &str, bytes: &[u8]) -> Result<ArtifactMetadata> {
    let sha256 = sha256_hex(bytes);
    let mut meta = ArtifactMetadata {
        file_name: file_name.to_string(),
        size_bytes: bytes.len() as u64,
        sha256,
        loaders: Vec::new(),
        id: None,
        name: None,
        version: None,
        description: None,
        api_version: None,
        authors: Vec::new(),
        dependencies: Vec::new(),
        descriptors_found: Vec::new(),
    };

    let cursor = Cursor::new(bytes);
    let Ok(mut archive) = ZipArchive::new(cursor) else {
        return Ok(meta);
    };

    let mut loaders = BTreeSet::new();
    let mut deps = BTreeSet::new();
    let mut authors = BTreeSet::new();

    if let Some(content) = read_zip_entry(&mut archive, "paper-plugin.yml") {
        meta.descriptors_found.push("paper-plugin.yml".to_string());
        loaders.insert("paper".to_string());
        parse_simple_yaml(&content, &mut meta, &mut loaders, &mut deps, &mut authors);
    }

    if let Some(content) = read_zip_entry(&mut archive, "plugin.yml") {
        meta.descriptors_found.push("plugin.yml".to_string());
        for l in ["bukkit", "spigot", "paper", "purpur"] {
            loaders.insert(l.to_string());
        }
        parse_simple_yaml(&content, &mut meta, &mut loaders, &mut deps, &mut authors);
    }

    if let Some(content) = read_zip_entry(&mut archive, "bungee.yml") {
        meta.descriptors_found.push("bungee.yml".to_string());
        loaders.insert("bungeecord".to_string());
        loaders.insert("waterfall".to_string());
        parse_simple_yaml(&content, &mut meta, &mut loaders, &mut deps, &mut authors);
    }

    if let Some(content) = read_zip_entry(&mut archive, "velocity-plugin.json") {
        meta.descriptors_found
            .push("velocity-plugin.json".to_string());
        loaders.insert("velocity".to_string());
        parse_velocity_json(&content, &mut meta, &mut deps, &mut authors);
    }

    if let Some(content) = read_zip_entry(&mut archive, "fabric.mod.json") {
        meta.descriptors_found.push("fabric.mod.json".to_string());
        loaders.insert("fabric".to_string());
        parse_fabric_json(&content, &mut meta, &mut deps, &mut authors);
    }

    if let Some(content) = read_zip_entry(&mut archive, "quilt.mod.json") {
        meta.descriptors_found.push("quilt.mod.json".to_string());
        loaders.insert("quilt".to_string());
        parse_quilt_json(&content, &mut meta, &mut authors);
    }

    if let Some(content) = read_zip_entry(&mut archive, "META-INF/neoforge.mods.toml") {
        meta.descriptors_found
            .push("META-INF/neoforge.mods.toml".to_string());
        loaders.insert("neoforge".to_string());
        parse_mods_toml(&content, &mut meta, &mut authors);
    }

    if let Some(content) = read_zip_entry(&mut archive, "META-INF/mods.toml") {
        meta.descriptors_found
            .push("META-INF/mods.toml".to_string());
        loaders.insert("forge".to_string());
        parse_mods_toml(&content, &mut meta, &mut authors);
    }

    meta.loaders = loaders.into_iter().collect();
    meta.dependencies = deps.into_iter().collect();
    meta.authors = authors.into_iter().collect();

    Ok(meta)
}

pub fn inspect_file(path: &std::path::Path) -> Result<ArtifactMetadata> {
    let bytes = std::fs::read(path).map_err(CometError::Io)?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("artifact.jar");
    inspect_jar_bytes(name, &bytes)
}

pub fn check_loader_compatibility(
    meta: &ArtifactMetadata,
    target_loaders: &[String],
) -> Option<String> {
    if meta.loaders.is_empty() || target_loaders.is_empty() {
        return None;
    }

    let has_overlap = target_loaders.iter().any(|target_loader| {
        let lower = target_loader.to_lowercase();
        meta.loaders.iter().any(|detected| {
            let det = detected.to_lowercase();
            det == lower || (det == "fabric" && lower == "quilt")
        })
    });

    if has_overlap {
        return None;
    }

    Some(format!(
        "artifact loaders [{}] do not match target loaders [{}]",
        meta.loaders.join(", "),
        target_loaders.join(", ")
    ))
}

fn read_zip_entry(archive: &mut ZipArchive<Cursor<&[u8]>>, name: &str) -> Option<String> {
    let mut file = archive.by_name(name).ok()?;
    let mut out = String::new();
    file.read_to_string(&mut out).ok()?;
    Some(out)
}

fn parse_simple_yaml(
    content: &str,
    meta: &mut ArtifactMetadata,
    loaders: &mut BTreeSet<String>,
    deps: &mut BTreeSet<String>,
    authors: &mut BTreeSet<String>,
) {
    let mut current_list_key: Option<&str> = None;

    for raw_line in content.lines() {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let is_indented = raw_line.starts_with(' ') || raw_line.starts_with('\t');
        if is_indented {
            if let Some(item) = trimmed.strip_prefix("- ") {
                let cleaned = clean_scalar(item);
                if !cleaned.is_empty() {
                    match current_list_key {
                        Some("authors") => {
                            authors.insert(cleaned);
                        }
                        Some("depend") | Some("softdepend") => {
                            deps.insert(cleaned);
                        }
                        _ => {}
                    }
                }
            }
            continue;
        }

        current_list_key = None;
        let Some((key, rest)) = trimmed.split_once(':') else {
            continue;
        };
        let key = key.trim();
        let val = rest.trim();

        match key {
            "name" => {
                let v = clean_scalar(val);
                if !v.is_empty() && meta.name.is_none() {
                    meta.name = Some(v);
                }
            }
            "version" => {
                let v = clean_scalar(val);
                if !v.is_empty() && meta.version.is_none() {
                    meta.version = Some(v);
                }
            }
            "description" => {
                let v = clean_scalar(val);
                if !v.is_empty() && meta.description.is_none() {
                    meta.description = Some(v);
                }
            }
            "api-version" => {
                let v = clean_scalar(val);
                if !v.is_empty() && meta.api_version.is_none() {
                    meta.api_version = Some(v);
                }
            }
            "author" => {
                let v = clean_scalar(val);
                if !v.is_empty() {
                    authors.insert(v);
                }
            }
            "authors" => {
                if val.is_empty() {
                    current_list_key = Some("authors");
                } else {
                    for item in parse_inline_yaml_list(val) {
                        authors.insert(item);
                    }
                }
            }
            "depend" | "softdepend" => {
                if val.is_empty() {
                    current_list_key = Some(key);
                } else {
                    for item in parse_inline_yaml_list(val) {
                        deps.insert(item);
                    }
                }
            }
            "folia-supported" => {
                if clean_scalar(val).eq_ignore_ascii_case("true") {
                    loaders.insert("folia".to_string());
                }
            }
            _ => {}
        }
    }
}

fn parse_inline_yaml_list(raw: &str) -> Vec<String> {
    let inner = raw
        .trim()
        .strip_prefix('[')
        .and_then(|s| s.strip_suffix(']'))
        .unwrap_or(raw);
    inner
        .split(',')
        .map(clean_scalar)
        .filter(|s| !s.is_empty())
        .collect()
}

fn clean_scalar(raw: &str) -> String {
    let trimmed = raw.trim();
    let unquoted = trimmed
        .strip_prefix('"')
        .and_then(|s| s.strip_suffix('"'))
        .or_else(|| {
            trimmed
                .strip_prefix('\'')
                .and_then(|s| s.strip_suffix('\''))
        })
        .unwrap_or(trimmed);
    unquoted.trim().to_string()
}

fn parse_velocity_json(
    content: &str,
    meta: &mut ArtifactMetadata,
    deps: &mut BTreeSet<String>,
    authors: &mut BTreeSet<String>,
) {
    let Ok(val) = serde_json::from_str::<serde_json::Value>(content) else {
        return;
    };
    set_if_none(&mut meta.id, val.get("id").and_then(|v| v.as_str()));
    set_if_none(&mut meta.name, val.get("name").and_then(|v| v.as_str()));
    set_if_none(
        &mut meta.version,
        val.get("version").and_then(|v| v.as_str()),
    );
    set_if_none(
        &mut meta.description,
        val.get("description").and_then(|v| v.as_str()),
    );
    if let Some(arr) = val.get("authors").and_then(|v| v.as_array()) {
        for item in arr {
            if let Some(a) = item.as_str() {
                authors.insert(a.to_string());
            }
        }
    }
    if let Some(arr) = val.get("dependencies").and_then(|v| v.as_array()) {
        for item in arr {
            if let Some(dep_id) = item.get("id").and_then(|v| v.as_str()) {
                deps.insert(dep_id.to_string());
            }
        }
    }
}

fn parse_fabric_json(
    content: &str,
    meta: &mut ArtifactMetadata,
    deps: &mut BTreeSet<String>,
    authors: &mut BTreeSet<String>,
) {
    let Ok(val) = serde_json::from_str::<serde_json::Value>(content) else {
        return;
    };
    set_if_none(&mut meta.id, val.get("id").and_then(|v| v.as_str()));
    set_if_none(&mut meta.name, val.get("name").and_then(|v| v.as_str()));
    set_if_none(
        &mut meta.version,
        val.get("version").and_then(|v| v.as_str()),
    );
    set_if_none(
        &mut meta.description,
        val.get("description").and_then(|v| v.as_str()),
    );
    if let Some(arr) = val.get("authors").and_then(|v| v.as_array()) {
        for item in arr {
            if let Some(a) = item.as_str() {
                authors.insert(a.to_string());
            } else if let Some(a) = item.get("name").and_then(|v| v.as_str()) {
                authors.insert(a.to_string());
            }
        }
    }
    if let Some(obj) = val.get("depends").and_then(|v| v.as_object()) {
        for key in obj.keys() {
            if !matches!(key.as_str(), "minecraft" | "java" | "fabricloader") {
                deps.insert(key.clone());
            }
        }
    }
}

fn parse_quilt_json(content: &str, meta: &mut ArtifactMetadata, authors: &mut BTreeSet<String>) {
    let Ok(val) = serde_json::from_str::<serde_json::Value>(content) else {
        return;
    };
    let Some(loader) = val.get("quilt_loader") else {
        return;
    };
    set_if_none(&mut meta.id, loader.get("id").and_then(|v| v.as_str()));
    set_if_none(
        &mut meta.version,
        loader.get("version").and_then(|v| v.as_str()),
    );
    if let Some(md) = loader.get("metadata") {
        set_if_none(&mut meta.name, md.get("name").and_then(|v| v.as_str()));
        set_if_none(
            &mut meta.description,
            md.get("description").and_then(|v| v.as_str()),
        );
        if let Some(obj) = md.get("contributors").and_then(|v| v.as_object()) {
            for key in obj.keys() {
                authors.insert(key.clone());
            }
        }
    }
}

fn parse_mods_toml(content: &str, meta: &mut ArtifactMetadata, authors: &mut BTreeSet<String>) {
    let Ok(val) = toml::from_str::<toml::Value>(content) else {
        return;
    };
    let Some(mods) = val.get("mods").and_then(|v| v.as_array()) else {
        return;
    };
    let Some(first) = mods.first() else {
        return;
    };
    set_if_none(&mut meta.id, first.get("modId").and_then(|v| v.as_str()));
    set_if_none(
        &mut meta.name,
        first.get("displayName").and_then(|v| v.as_str()),
    );
    set_if_none(
        &mut meta.version,
        first.get("version").and_then(|v| v.as_str()),
    );
    set_if_none(
        &mut meta.description,
        first.get("description").and_then(|v| v.as_str()),
    );
    if let Some(author_str) = first.get("authors").and_then(|v| v.as_str()) {
        for part in author_str.split(',') {
            let trimmed = part.trim();
            if !trimmed.is_empty() {
                authors.insert(trimmed.to_string());
            }
        }
    }
}

fn set_if_none(slot: &mut Option<String>, val: Option<&str>) {
    if slot.is_none()
        && let Some(s) = val
    {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            *slot = Some(trimmed.to_string());
        }
    }
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use zip::ZipWriter;
    use zip::write::SimpleFileOptions;

    use super::*;

    fn build_test_jar(entries: &[(&str, &str)]) -> Vec<u8> {
        let mut buf = Cursor::new(Vec::new());
        {
            let mut zip = ZipWriter::new(&mut buf);
            let opts = SimpleFileOptions::default();
            for (path, body) in entries {
                zip.start_file(*path, opts).expect("start zip entry");
                zip.write_all(body.as_bytes()).expect("write zip entry");
            }
            zip.finish().expect("finish zip");
        }
        buf.into_inner()
    }

    #[test]
    fn computes_known_sha256_digest() {
        assert_eq!(
            sha256_hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn inspects_paper_and_folia_plugin_yml() {
        let jar = build_test_jar(&[(
            "plugin.yml",
            "name: FrPass\nversion: 1.4.0\napi-version: '1.21'\nfolia-supported: true\nauthors: [Fraio, Tost]\nsoftdepend: [Vault, PlaceholderAPI]\n",
        )]);

        let meta = inspect_jar_bytes("FrPass-1.4.0.jar", &jar).expect("inspect jar");
        assert_eq!(meta.name.as_deref(), Some("FrPass"));
        assert_eq!(meta.version.as_deref(), Some("1.4.0"));
        assert_eq!(meta.api_version.as_deref(), Some("1.21"));
        assert!(meta.loaders.contains(&"paper".to_string()));
        assert!(meta.loaders.contains(&"folia".to_string()));
        assert_eq!(meta.authors, vec!["Fraio", "Tost"]);
        assert_eq!(meta.dependencies, vec!["PlaceholderAPI", "Vault"]);
        assert_eq!(meta.sha256.len(), 64);
    }

    #[test]
    fn inspects_fabric_mod_json() {
        let jar = build_test_jar(&[(
            "fabric.mod.json",
            r#"{"id":"cometmod","name":"Comet Mod","version":"2.0.1","authors":["Fraio"],"depends":{"fabric-api":"*","minecraft":"1.21.4"}}"#,
        )]);

        let meta = inspect_jar_bytes("cometmod-2.0.1.jar", &jar).expect("inspect fabric");
        assert_eq!(meta.id.as_deref(), Some("cometmod"));
        assert_eq!(meta.name.as_deref(), Some("Comet Mod"));
        assert_eq!(meta.version.as_deref(), Some("2.0.1"));
        assert_eq!(meta.loaders, vec!["fabric"]);
        assert_eq!(meta.dependencies, vec!["fabric-api"]);
    }

    #[test]
    fn inspects_neoforge_mods_toml() {
        let jar = build_test_jar(&[(
            "META-INF/neoforge.mods.toml",
            "[[mods]]\nmodId=\"example\"\ndisplayName=\"Example Mod\"\nversion=\"0.9.0\"\nauthors=\"Alice, Bob\"\n",
        )]);

        let meta = inspect_jar_bytes("example.jar", &jar).expect("inspect neoforge");
        assert_eq!(meta.id.as_deref(), Some("example"));
        assert_eq!(meta.name.as_deref(), Some("Example Mod"));
        assert_eq!(meta.version.as_deref(), Some("0.9.0"));
        assert_eq!(meta.loaders, vec!["neoforge"]);
        assert_eq!(meta.authors, vec!["Alice", "Bob"]);
    }

    #[test]
    fn detects_loader_mismatch() {
        let jar = build_test_jar(&[("fabric.mod.json", r#"{"id":"m","version":"1.0"}"#)]);
        let meta = inspect_jar_bytes("m.jar", &jar).expect("inspect");

        assert!(check_loader_compatibility(&meta, &["fabric".into()]).is_none());
        assert!(check_loader_compatibility(&meta, &["quilt".into()]).is_none());
        assert!(check_loader_compatibility(&meta, &["paper".into(), "spigot".into()]).is_some());
    }
}
