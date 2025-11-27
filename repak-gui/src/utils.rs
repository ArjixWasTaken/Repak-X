use std::option::Option;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use std::{fs, io};

#[derive(Debug, Deserialize, Serialize, Hash)]
struct SkinEntry {
    skinid: String,
    #[serde(rename = "skin_name")]
    skin_name: String,
    name: String,
}

static SKIN_ENTRIES: LazyLock<HashMap<u32, SkinEntry>> = LazyLock::new(|| {
    let skins: Vec<SkinEntry> =
        serde_json::from_str(include_str!("data/character_data.json")).expect("Invalid JSON");
    let skin_map: HashMap<u32, SkinEntry> = skins
        .into_iter()
        .map(|entry| (entry.skinid.parse().unwrap(), entry))
        .collect();

    skin_map
});

static SKIN_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[0-9]{4}\/[0-9]{7}").unwrap()
});

pub fn collect_files(paths: &mut Vec<PathBuf>, dir: &Path) -> io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_files(paths, &path)?;
        } else {
            paths.push(entry.path());
        }
    }
    Ok(())
}

pub enum ModType {
    Default(String),
    Custom(String),
}
pub fn get_character_mod_skin(file: &str) -> Option<ModType> {
    let skin_id = SKIN_REGEX.clone().captures(file);
    if let Some(skin_id) = skin_id {
        let skin_id = skin_id[0].to_string();
        let skin_id = &skin_id[5..];
        let skin = SKIN_ENTRIES.get(&(skin_id.parse().unwrap()));
        if let Some(skin) = skin {
            if skin.skin_name == "Default" {
                return Some(ModType::Default(format!(
                    "{} - {}",
                    &skin.name, &skin.skin_name
                )));
            }
            return Some(ModType::Custom(format!(
                "{} - {}",
                &skin.name, &skin.skin_name
            )));
        }
        None
    } else {
        None
    }
}
pub fn get_current_pak_characteristics(mod_contents: Vec<String>) -> String {
    let mut fallback: Option<String> = None;
    
    // Track what content types we find
    let mut has_skeletal_mesh = false;
    let mut has_static_mesh = false;
    let mut has_texture = false;
    let mut has_material = false;
    let mut has_audio = false;
    let mut has_movies = false;
    let mut has_ui = false;
    let mut character_name: Option<String> = None;

    for file in &mod_contents {
        let path = file
            .strip_prefix("Marvel/Content/Marvel/")
            .or_else(|| file.strip_prefix("/Game/Marvel/"))
            .unwrap_or(file);
        
        let filename = path.split('/').last().unwrap_or("");
        let filename_lower = filename.to_lowercase();
        let path_lower = path.to_lowercase();

        // Check for specific asset types by filename pattern
        // Note: Internal paths may or may not have .uasset extension
        let is_uasset = filename_lower.ends_with(".uasset") || !filename_lower.contains('.');
        
        if filename_lower.starts_with("sk_") && is_uasset {
            has_skeletal_mesh = true;
        }
        if filename_lower.starts_with("sm_") && is_uasset {
            has_static_mesh = true;
        }
        if filename_lower.starts_with("t_") && is_uasset {
            has_texture = true;
        }
        
        // VFX: MI_ files in VFX path (e.g. /Game/Marvel/VFX/Materials/...)
        // Check both original file path and stripped path
        let file_lower = file.to_lowercase();
        if filename_lower.starts_with("mi_") && (path_lower.contains("/vfx/") || path_lower.starts_with("vfx/") || file_lower.contains("/vfx/")) {
            has_material = true;
        }
        
        // Check path-based categories
        if path_lower.contains("wwiseaudio") || file_lower.contains("wwiseaudio") {
            has_audio = true;
        }
        
        // UI: Files in UI folder
        if path_lower.contains("/ui/") || path_lower.starts_with("ui/") || file_lower.contains("/ui/") {
            has_ui = true;
        }
        
        // Movies: Files in Movies folder (placeholder - user to research exact criteria)
        if path_lower.contains("/movies/") || path_lower.starts_with("movies/") || file_lower.contains("/movies/") || path_lower.ends_with(".bik") || path_lower.ends_with(".mp4") {
            has_movies = true;
        }

        let category = path.split('/').next().unwrap_or_default();

        match category {
            "Characters" => {
                match get_character_mod_skin(path) {
                    Some(ModType::Custom(skin)) => character_name = Some(skin),
                    Some(ModType::Default(name)) => fallback = Some(name),
                    None => {}
                }
            }
            _ => {}
        }
    }

    // Priority order for mod type determination
    // Audio and Movies are special standalone types
    if has_audio && !has_skeletal_mesh && !has_static_mesh && !has_texture && !has_material {
        return "Audio".to_string();
    }
    if has_movies && !has_skeletal_mesh && !has_static_mesh && !has_texture && !has_material {
        return "Movies".to_string();
    }
    if has_ui && !has_skeletal_mesh && !has_static_mesh && !has_texture && !has_material {
        return "UI".to_string();
    }
    
    // For character mods, be more specific about what kind
    if let Some(char_name) = character_name {
        // Determine the sub-type (priority order)
        if has_skeletal_mesh {
            return format!("{} (Mesh)", char_name);
        }
        if has_static_mesh {
            return format!("{} (Static Mesh)", char_name);
        }
        if has_material {
            return format!("{} (VFX)", char_name);
        }
        // Retexture is lowest priority - only if nothing else matches
        if has_texture {
            return format!("{} (Retexture)", char_name);
        }
        // Mixed or just character
        return char_name;
    }
    
    // Standalone type detection (non-character mods) - priority order
    if has_skeletal_mesh {
        return "Mesh".to_string();
    }
    if has_static_mesh {
        return "Static Mesh".to_string();
    }
    if has_material {
        return "VFX".to_string();
    }
    if has_audio {
        return "Audio".to_string();
    }
    // Retexture is lowest priority - only if nothing else matches
    if has_texture {
        return "Retexture".to_string();
    }

    fallback.unwrap_or_else(|| "Unknown".to_string())
}


use log::info;
use serde::{Deserialize, Serialize};
use regex_lite::Regex;

pub fn find_marvel_rivals() -> Option<PathBuf> {
    let shit = get_steam_library_paths();
    if shit.is_empty() {
        return None;
    }

    for lib in shit {
        let path = lib.join("steamapps/common/MarvelRivals/MarvelGame/Marvel/Content/Paks");
        if path.exists() {
            return Some(path);
        }
    }
    println!("Marvel Rivals not found.");
    None
}

/// Reads `libraryfolders.vdf` to find additional Steam libraries.
fn get_steam_library_paths() -> Vec<PathBuf> {
    #[cfg(target_os = "windows")]
    let vdf_path = PathBuf::from("C:/Program Files (x86)/Steam/steamapps/libraryfolders.vdf");

    #[cfg(target_os = "linux")]
    let vdf_path = PathBuf::from("~/.steam/steam/steamapps/libraryfolders.vdf");

    if !vdf_path.exists() {
        return vec![];
    }

    let content = fs::read_to_string(vdf_path).ok().unwrap_or_default();
    let mut paths = Vec::new();

    for line in content.lines() {
        // if line.contains('"') {
        //     let path: String = line
        //         .split('"')
        //         .nth(3)  // Extracts the path
        //         .map(|s| s.replace("\\\\", "/"))?; // Fix Windows paths
        //     paths.push(PathBuf::from(path).join("steamapps/common"));
        // }
        if line.trim().starts_with("\"path\"") {
            let path = line
                .split("\"")
                .nth(3)
                .map(|s| PathBuf::from(s.replace("\\\\", "\\")));
            info!("Found steam library path: {:?}", path);
            paths.push(path.unwrap());
        }
    }

    paths
}
