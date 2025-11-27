// Character Data Management
// Handles external character_data.json in roaming folder with caching for performance
// Also includes rivalskins.com scraper functionality

use log::{info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use once_cell::sync::Lazy;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterSkin {
    pub name: String,       // Character name
    pub id: String,         // Character ID (e.g., "1011" for Hulk)
    pub skinid: String,     // Skin ID (e.g., "1011001" for default)
    pub skin_name: String,  // Skin display name
}

/// Cached character data for fast lookups
pub struct CharacterDataCache {
    /// All skins indexed by skin ID for O(1) lookup
    by_skin_id: HashMap<String, CharacterSkin>,
    /// Character IDs indexed by character name
    character_ids: HashMap<String, String>,
    /// All skins as a list
    all_skins: Vec<CharacterSkin>,
    /// Whether the cache has been initialized
    initialized: bool,
}

impl Default for CharacterDataCache {
    fn default() -> Self {
        Self {
            by_skin_id: HashMap::new(),
            character_ids: HashMap::new(),
            all_skins: Vec::new(),
            initialized: false,
        }
    }
}

// Global cache with thread-safe access
static CHARACTER_CACHE: Lazy<Arc<RwLock<CharacterDataCache>>> = Lazy::new(|| {
    Arc::new(RwLock::new(CharacterDataCache::default()))
});

// ============================================================================
// KNOWN CHARACTER IDS (for default skin generation)
// ============================================================================

/// Known character IDs - used for generating default skin IDs
pub fn get_known_character_ids() -> HashMap<String, String> {
    let mut map = HashMap::new();
    map.insert("Hulk".to_string(), "1011".to_string());
    map.insert("Punisher".to_string(), "1014".to_string());
    map.insert("Storm".to_string(), "1015".to_string());
    map.insert("Loki".to_string(), "1016".to_string());
    map.insert("Human Torch".to_string(), "1017".to_string());
    map.insert("Doctor Strange".to_string(), "1018".to_string());
    map.insert("Mantis".to_string(), "1020".to_string());
    map.insert("Hawkeye".to_string(), "1021".to_string());
    map.insert("Captain America".to_string(), "1022".to_string());
    map.insert("Rocket Raccoon".to_string(), "1023".to_string());
    map.insert("Hela".to_string(), "1024".to_string());
    map.insert("Cloak & Dagger".to_string(), "1025".to_string());
    map.insert("Black Panther".to_string(), "1026".to_string());
    map.insert("Groot".to_string(), "1027".to_string());
    map.insert("Ultron".to_string(), "1028".to_string());
    map.insert("Magik".to_string(), "1029".to_string());
    map.insert("Moon Knight".to_string(), "1030".to_string());
    map.insert("Luna Snow".to_string(), "1031".to_string());
    map.insert("Squirrel Girl".to_string(), "1032".to_string());
    map.insert("Black Widow".to_string(), "1033".to_string());
    map.insert("Iron Man".to_string(), "1034".to_string());
    map.insert("Venom".to_string(), "1035".to_string());
    map.insert("Spider-Man".to_string(), "1036".to_string());
    map.insert("Magneto".to_string(), "1037".to_string());
    map.insert("Scarlet Witch".to_string(), "1038".to_string());
    map.insert("Thor".to_string(), "1039".to_string());
    map.insert("Mister Fantastic".to_string(), "1040".to_string());
    map.insert("Winter Soldier".to_string(), "1041".to_string());
    map.insert("Peni Parker".to_string(), "1042".to_string());
    map.insert("Star-Lord".to_string(), "1043".to_string());
    map.insert("Blade".to_string(), "1044".to_string());
    map.insert("Namor".to_string(), "1045".to_string());
    map.insert("Adam Warlock".to_string(), "1046".to_string());
    map.insert("Jeff the Landshark".to_string(), "1047".to_string());
    map.insert("Psylocke".to_string(), "1048".to_string());
    map.insert("Wolverine".to_string(), "1049".to_string());
    map.insert("Invisible Woman".to_string(), "1050".to_string());
    map.insert("The Thing".to_string(), "1051".to_string());
    map.insert("Iron Fist".to_string(), "1052".to_string());
    map.insert("Emma Frost".to_string(), "1053".to_string());
    map.insert("Phoenix".to_string(), "1054".to_string());
    map.insert("Daredevil".to_string(), "1055".to_string());
    map.insert("Angela".to_string(), "1056".to_string());
    map.insert("Gambit".to_string(), "1058".to_string());
    map
}

// ============================================================================
// FILE PATHS
// ============================================================================

/// Get the path to the character data JSON file in roaming folder
pub fn character_data_path() -> PathBuf {
    let app_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("RepakGuiRevamped");
    
    // Ensure directory exists
    let _ = fs::create_dir_all(&app_dir);
    
    app_dir.join("character_data.json")
}

/// Get the path to the bundled default character data (fallback)
pub fn bundled_character_data_path() -> Option<PathBuf> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let bundled = exe_dir.join("data").join("character_data.json");
            if bundled.exists() {
                return Some(bundled);
            }
        }
    }
    None
}

// ============================================================================
// DATA LOADING / SAVING
// ============================================================================

/// Load character data from external JSON file
pub fn load_character_data() -> Vec<CharacterSkin> {
    let path = character_data_path();
    
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(contents) => {
                match serde_json::from_str::<Vec<CharacterSkin>>(&contents) {
                    Ok(skins) => {
                        info!("Loaded {} character skins from {}", skins.len(), path.display());
                        return skins;
                    }
                    Err(e) => {
                        warn!("Failed to parse character data: {}", e);
                    }
                }
            }
            Err(e) => {
                warn!("Failed to read character data file: {}", e);
            }
        }
    }
    
    // Try bundled fallback
    if let Some(bundled_path) = bundled_character_data_path() {
        if let Ok(contents) = fs::read_to_string(&bundled_path) {
            if let Ok(skins) = serde_json::from_str::<Vec<CharacterSkin>>(&contents) {
                info!("Loaded {} character skins from bundled file", skins.len());
                // Save to external location for future use
                let _ = save_character_data(&skins);
                return skins;
            }
        }
    }
    
    info!("No character data found, returning empty list");
    Vec::new()
}

/// Save character data to external JSON file
pub fn save_character_data(skins: &[CharacterSkin]) -> Result<(), String> {
    let path = character_data_path();
    
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    let json = serde_json::to_string_pretty(skins)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;
    
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    info!("Saved {} character skins to {}", skins.len(), path.display());
    Ok(())
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/// Initialize or refresh the character data cache
pub fn refresh_cache() {
    let skins = load_character_data();
    
    let mut cache = CHARACTER_CACHE.write().unwrap();
    cache.by_skin_id.clear();
    cache.character_ids.clear();
    cache.all_skins.clear();
    
    for skin in &skins {
        cache.by_skin_id.insert(skin.skinid.clone(), skin.clone());
        cache.character_ids.insert(skin.name.clone(), skin.id.clone());
    }
    
    cache.all_skins = skins;
    cache.initialized = true;
    
    info!("Character data cache refreshed: {} skins, {} characters", 
          cache.by_skin_id.len(), cache.character_ids.len());
}

/// Ensure cache is initialized (lazy initialization)
fn ensure_cache_initialized() {
    let needs_init = {
        let cache = CHARACTER_CACHE.read().unwrap();
        !cache.initialized
    };
    
    if needs_init {
        refresh_cache();
    }
}

/// Get character info by skin ID (fast cached lookup)
pub fn get_character_by_skin_id(skin_id: &str) -> Option<CharacterSkin> {
    ensure_cache_initialized();
    
    let cache = CHARACTER_CACHE.read().unwrap();
    cache.by_skin_id.get(skin_id).cloned()
}

/// Get all character data
pub fn get_all_character_data() -> Vec<CharacterSkin> {
    ensure_cache_initialized();
    
    let cache = CHARACTER_CACHE.read().unwrap();
    cache.all_skins.clone()
}

// ============================================================================
// RIVALSKINS.COM SCRAPER
// ============================================================================

/// Character name mappings from URL slug to proper name
fn get_character_name_from_slug(slug: &str) -> String {
    match slug {
        "the-punisher" => "Punisher".to_string(),
        "the-thing" => "The Thing".to_string(),
        "cloak-and-dagger" => "Cloak & Dagger".to_string(),
        "jeff-the-landshark" => "Jeff the Landshark".to_string(),
        _ => {
            // Convert slug to title case
            slug.split('-')
                .map(|word| {
                    let mut chars = word.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(first) => first.to_uppercase().chain(chars).collect(),
                    }
                })
                .collect::<Vec<_>>()
                .join(" ")
        }
    }
}

/// Parse the main page and extract links (sync helper to avoid Send issues)
fn parse_costume_links(html: &str) -> Vec<(String, String, String)> {
    use scraper::{Html, Selector};
    
    let document = Html::parse_document(html);
    let link_selector = Selector::parse("a[href*='/item/']").unwrap();
    let costume_regex = regex_lite::Regex::new(r"/item/\d+/(.*?)-costume-(.*)/?").unwrap();
    
    let mut links: Vec<(String, String, String)> = Vec::new();
    
    for element in document.select(&link_selector) {
        if let Some(href) = element.value().attr("href") {
            if let Some(caps) = costume_regex.captures(href) {
                let char_slug = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                let skin_slug = caps.get(2).map(|m| m.as_str()).unwrap_or("");
                
                let char_name = get_character_name_from_slug(char_slug);
                
                // Clean skin name from slug
                let skin_name = skin_slug
                    .trim_end_matches('/')
                    .split('-')
                    .map(|word| {
                        let mut chars = word.chars();
                        match chars.next() {
                            None => String::new(),
                            Some(first) => first.to_uppercase().chain(chars).collect(),
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ");
                
                if !char_name.is_empty() && !skin_name.is_empty() {
                    let full_url = if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("https://rivalskins.com{}", href)
                    };
                    
                    links.push((full_url, char_name, skin_name));
                }
            }
        }
    }
    
    links
}

/// Parse item page to extract skin ID (sync helper to avoid Send issues)
fn parse_skin_id_from_html(html: &str) -> Option<String> {
    use scraper::{Html, Selector};
    
    let document = Html::parse_document(html);
    let td_selector = Selector::parse("td").unwrap();
    let skin_id_regex = regex_lite::Regex::new(r"^(ps)?(\d{7})$").unwrap();
    
    for td in document.select(&td_selector) {
        let text = td.text().collect::<String>();
        let text = text.trim();
        
        if let Some(caps) = skin_id_regex.captures(text) {
            // Remove "ps" prefix if present
            let skin_id = caps.get(2).map(|m| m.as_str()).unwrap_or(text);
            return Some(skin_id.to_string());
        }
    }
    
    None
}

/// Fetch skin data from rivalskins.com
pub async fn fetch_rivalskins_data() -> Result<Vec<CharacterSkin>, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    info!("Fetching skin data from rivalskins.com...");
    
    // Fetch the costumes page
    let response = client
        .get("https://rivalskins.com/?type=costume")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch rivalskins.com: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("rivalskins.com returned status: {}", response.status()));
    }
    
    let html = response.text().await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    // Parse links synchronously to avoid Send issues with scraper
    let links_to_fetch = parse_costume_links(&html);
    
    info!("Found {} costume links to process", links_to_fetch.len());
    
    let mut skins: Vec<CharacterSkin> = Vec::new();
    let known_ids = get_known_character_ids();
    
    // Fetch each item page to get skin ID
    for (url, char_name, skin_name) in links_to_fetch {
        // Add delay to be respectful
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        
        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(item_html) = resp.text().await {
                    // Parse synchronously to avoid Send issues
                    let found_skin_id = parse_skin_id_from_html(&item_html);
                    
                    // If no skin ID found, check if it's a default skin
                    let skin_id = if let Some(id) = found_skin_id {
                        id
                    } else {
                        let skin_lower = skin_name.to_lowercase();
                        let is_default = skin_lower.contains("default");
                        
                        if is_default {
                            // Default skins use pattern: character_id + "001"
                            if let Some(char_id) = known_ids.get(&char_name) {
                                format!("{}001", char_id)
                            } else {
                                warn!("No character ID for default skin: {} - {}", char_name, skin_name);
                                continue;
                            }
                        } else {
                            warn!("Could not find skin ID for: {} - {}", char_name, skin_name);
                            continue;
                        }
                    };
                    
                    // Extract character ID from skin ID (first 4 digits)
                    let char_id = if skin_id.len() >= 4 {
                        skin_id[..4].to_string()
                    } else if let Some(id) = known_ids.get(&char_name) {
                        id.clone()
                    } else {
                        continue;
                    };
                    
                    skins.push(CharacterSkin {
                        name: char_name,
                        id: char_id,
                        skinid: skin_id,
                        skin_name,
                    });
                }
            }
            Ok(resp) => {
                warn!("Failed to fetch {}: {}", url, resp.status());
            }
            Err(e) => {
                warn!("Error fetching {}: {}", url, e);
            }
        }
    }
    
    info!("Fetched {} skins from rivalskins.com", skins.len());
    Ok(skins)
}

/// Merge new skins with existing data (preserves existing, adds new)
/// Sorts by character ID (numeric), then skin ID (numeric) to maintain consistent ordering
pub fn merge_character_data(existing: &[CharacterSkin], new_skins: &[CharacterSkin]) -> Vec<CharacterSkin> {
    let mut merged: HashMap<String, CharacterSkin> = HashMap::new();
    
    // Add existing first
    for skin in existing {
        merged.insert(skin.skinid.clone(), skin.clone());
    }
    
    // Add/update with new skins
    for skin in new_skins {
        merged.insert(skin.skinid.clone(), skin.clone());
    }
    
    let mut result: Vec<_> = merged.into_values().collect();
    
    // Sort by character ID (numeric), then skin ID (numeric) for consistent ordering
    // This matches the original file's organization
    result.sort_by(|a, b| {
        // Parse IDs as numbers for proper numeric sorting
        let a_char_id: u32 = a.id.parse().unwrap_or(0);
        let b_char_id: u32 = b.id.parse().unwrap_or(0);
        let a_skin_id: u32 = a.skinid.parse().unwrap_or(0);
        let b_skin_id: u32 = b.skinid.parse().unwrap_or(0);
        
        a_char_id.cmp(&b_char_id).then(a_skin_id.cmp(&b_skin_id))
    });
    
    result
}

/// Update character data from rivalskins.com (fetches, merges, saves, refreshes cache)
pub async fn update_from_rivalskins() -> Result<usize, String> {
    let existing = load_character_data();
    let new_skins = fetch_rivalskins_data().await?;
    
    let merged = merge_character_data(&existing, &new_skins);
    let new_count = merged.len() - existing.len();
    
    save_character_data(&merged)?;
    refresh_cache();
    
    Ok(new_count.max(0) as usize)
}

// ============================================================================
// UTILITY FUNCTIONS FOR MOD TYPE DETECTION
// ============================================================================

/// Try to determine character/skin info from a mod's file paths
/// Returns (character_name, skin_name) if found
pub fn identify_mod_from_paths(file_paths: &[String]) -> Option<(String, String)> {
    ensure_cache_initialized();
    
    // Look for skin ID patterns in file paths
    // Common patterns: /1011001/, /Hero/1011/, etc.
    let skin_id_regex = regex_lite::Regex::new(r"(\d{7})").unwrap();
    let hero_id_regex = regex_lite::Regex::new(r"/(?:Hero|Characters?)/(\d{4})/").unwrap();
    
    let cache = CHARACTER_CACHE.read().unwrap();
    
    for path in file_paths {
        // Try to find exact skin ID
        for caps in skin_id_regex.captures_iter(path) {
            if let Some(m) = caps.get(1) {
                let potential_id = m.as_str();
                if let Some(skin) = cache.by_skin_id.get(potential_id) {
                    return Some((skin.name.clone(), skin.skin_name.clone()));
                }
            }
        }
        
        // Try to find character ID
        if let Some(caps) = hero_id_regex.captures(path) {
            if let Some(m) = caps.get(1) {
                let char_id = m.as_str();
                // Find any skin with this character ID
                for skin in cache.all_skins.iter() {
                    if skin.id == char_id {
                        return Some((skin.name.clone(), "Unknown Skin".to_string()));
                    }
                }
            }
        }
    }
    
    None
}
