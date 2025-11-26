"""
Helper script to map rivalskins.com data to character_data.json format.

This script helps you:
1. Fetch skin names from rivalskins.com
2. Compare with existing character_data.json
3. Identify missing skins
4. Generate new entries with suggested IDs
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from pathlib import Path
from typing import List, Dict, Set
from collections import defaultdict

BASE_URL = "https://rivalskins.com"

# Character name mappings (rivalskins.com name -> game name)
CHARACTER_NAME_MAP = {
    "the-punisher": "Punisher",
    "the-thing": "The Thing",
    "jeff-the-landshark": "Jeff the Landshark",
    "cloak-and-dagger": "Cloak & Dagger",
}

# Known character IDs (you can expand this from your existing JSON)
CHARACTER_IDS = {
    "Hulk": "1011",
    "Punisher": "1014",
    "Storm": "1015",
    "Loki": "1016",
    "Human Torch": "1017",
    "Doctor Strange": "1018",
    "Mantis": "1020",
    "Hawkeye": "1021",
    "Captain America": "1022",
    "Rocket Raccoon": "1023",
    "Hela": "1024",
    "Cloak & Dagger": "1025",
    "Black Panther": "1026",
    "Groot": "1027",
    "Ultron": "1028",
    "Magik": "1029",
    "Moon Knight": "1030",
    "Luna Snow": "1031",
    "Squirrel Girl": "1032",
    "Black Widow": "1033",
    "Iron Man": "1034",
    "Venom": "1035",
    "Spider-Man": "1036",
    "Magneto": "1037",
    "Scarlet Witch": "1038",
    "Thor": "1039",
    "Mister Fantastic": "1040",
    "Winter Soldier": "1041",
    "Peni Parker": "1042",
    "Star-Lord": "1043",
    "Blade": "1044",
    "Namor": "1045",
    "Adam Warlock": "1046",
    "Jeff the Landshark": "1047",
    "Psylocke": "1048",
    "Wolverine": "1049",
    "Invisible Woman": "1050",
    "The Thing": "1051",
    "Iron Fist": "1052",
    "Emma Frost": "1053",
    "Phoenix": "1054",
    "Angela": "1056",
    "Daredevil": "1055",  # Assuming next available ID
}

def load_existing_data(json_path: str) -> List[Dict]:
    """Load existing character_data.json."""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_existing_skins(data: List[Dict]) -> Dict[str, Set[str]]:
    """Get existing skins organized by character."""
    skins_by_char = defaultdict(set)
    for entry in data:
        skins_by_char[entry['name']].add(entry['skin_name'])
    return skins_by_char

def fetch_rivalskins_data() -> Dict[str, List[Dict[str, str]]]:
    """
    Fetch skin data from rivalskins.com.
    Returns a dict of character_name -> [{'skin_name': str, 'skin_id': str, 'char_id': str}]
    """
    skins_by_char = defaultdict(list)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        # Fetch the costumes page (filtered view)
        print("Fetching rivalskins.com costume data...")
        response = requests.get(f"{BASE_URL}/?type=costume", headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all costume/skin links
        skin_links = soup.find_all('a', href=re.compile(r'/item/\d+/.*-costume-'))
        
        print(f"Found {len(skin_links)} costume links")
        
        for link in skin_links:
            href = link.get('href', '')
            skin_name_raw = link.get_text(strip=True)
            
            # Clean the skin name - remove UI elements like "+Wishlist+Locker"
            skin_name = skin_name_raw.replace('+Wishlist', '').replace('+Locker', '').strip()
            
            # Extract character from URL
            # Format: /item/1228/captain-america-costume-captain-klyntar/
            match = re.search(r'/item/\d+/(.*?)-costume-', href)
            if match:
                char_slug = match.group(1)
                
                # Convert slug to proper character name
                if char_slug == "the-punisher":
                    char_name = "Punisher"
                elif char_slug == "the-thing":
                    char_name = "The Thing"
                elif char_slug == "cloak-and-dagger":
                    char_name = "Cloak & Dagger"
                else:
                    char_name = char_slug.replace('-', ' ').title()
                
                # Apply additional name mapping
                char_name = CHARACTER_NAME_MAP.get(char_slug, char_name)
                
                # Now fetch the individual item page to get the skin ID
                if skin_name and href:
                    try:
                        # Build the full URL properly
                        if href.startswith('http'):
                            # Already a full URL
                            item_url = href
                        elif href.startswith('/'):
                            # Relative path starting with /
                            item_url = f"{BASE_URL}{href}"
                        else:
                            # Relative path without leading /
                            item_url = f"{BASE_URL}/{href}"
                        
                        print(f"  Fetching details for {char_name}: {skin_name}...")
                        
                        # Add small delay to avoid overwhelming the server
                        time.sleep(0.5)
                        
                        item_response = requests.get(item_url, headers=headers, timeout=10)
                        item_response.raise_for_status()
                        item_soup = BeautifulSoup(item_response.content, 'html.parser')
                        
                        # Look for the skin ID in the HTML
                        # Based on the screenshot: <td>1049301</td> or <td>ps1050504</td> with class="item-details-marvel-id"
                        # Some IDs have a "ps" prefix that needs to be removed
                        skin_id_elem = item_soup.find('td', string=re.compile(r'^(ps)?\d{7}$'))
                        
                        if skin_id_elem:
                            skin_id_raw = skin_id_elem.get_text(strip=True)
                            # Remove "ps" prefix if present
                            skin_id = skin_id_raw.replace('ps', '')
                            # Extract character ID (first 4 digits)
                            char_id = skin_id[:4]
                            
                            skins_by_char[char_name].append({
                                'skin_name': skin_name,
                                'skin_id': skin_id,
                                'char_id': char_id
                            })
                            print(f"    ✓ {char_name}: {skin_name} (ID: {skin_id})")
                        else:
                            # Check if this is a default skin
                            skin_lower = skin_name.lower()
                            is_default = 'default' in skin_lower or skin_name.endswith(' Default')
                            
                            if is_default:
                                # Default skins use character_id + 001
                                # Try to get character ID from CHARACTER_IDS mapping
                                char_id = CHARACTER_IDS.get(char_name)
                                if char_id:
                                    skin_id = f"{char_id}001"
                                    skins_by_char[char_name].append({
                                        'skin_name': skin_name,
                                        'skin_id': skin_id,
                                        'char_id': char_id
                                    })
                                    print(f"    ✓ {char_name}: {skin_name} (ID: {skin_id}) [DEFAULT]")
                                else:
                                    print(f"    ⚠️  Could not determine character ID for default skin: {skin_name}")
                            else:
                                print(f"    ⚠️  Could not find skin ID for {skin_name}")
                    except Exception as e:
                        print(f"    ❌ Error fetching {item_url}: {e}")
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        import traceback
        traceback.print_exc()
    
    return dict(skins_by_char)

def suggest_skin_id(character_id: str, skin_name: str, existing_skins: List[Dict]) -> str:
    """
    Suggest a skin ID based on skin name and existing patterns.
    """
    # Get existing skin IDs for this character
    char_skin_ids = [
        int(s['skinid']) for s in existing_skins 
        if s['id'] == character_id
    ]
    
    if not char_skin_ids:
        # First skin for this character
        return f"{character_id}001"
    
    # Determine variant code based on skin name/type
    skin_lower = skin_name.lower()
    
    # MCU/Movie skins (800 range)
    if any(keyword in skin_lower for keyword in ['mcu', 'movie', 'endgame', 'infinity war', 'multiverse', 'vol. 3', 'born again', 'love and thunder', 'wakanda forever', 'no way home', 'deadpool', 'wolverine', 'first steps']):
        base = 800
    # Legendary skins (500 range)
    elif any(keyword in skin_lower for keyword in ['legendary', 'ultimate', 'supreme', 'master', 'god', 'king', 'queen', 'lord', 'goddess', 'emperor', 'empress', 'maiden', 'herald']):
        base = 500
    # Epic skins (300 range)
    elif any(keyword in skin_lower for keyword in ['epic', 'galactic', 'immortal', 'cosmic', 'blood', 'phoenix', 'symbiote', 'polarity', 'will of galacta', 'retro', 'binary', 'chaos', 'vengeance', 'weapon', 'dog brother']):
        base = 300
    # Rare skins (100 range)
    else:
        base = 100
    
    # Find next available ID in this range
    range_ids = [sid for sid in char_skin_ids if base <= (sid % 1000) < base + 100]
    
    if range_ids:
        next_id = max(range_ids) + 1
    else:
        next_id = int(character_id) * 1000 + base
    
    return str(next_id)

def compare_and_generate(existing_data: List[Dict], rivalskins_data: Dict[str, List[Dict[str, str]]]) -> List[Dict]:
    """
    Compare existing data with rivalskins data and generate new entries.
    """
    existing_skins = get_existing_skins(existing_data)
    new_entries = []
    
    print("\n" + "=" * 80)
    print("COMPARISON REPORT")
    print("=" * 80)
    
    for char_name, skin_list in rivalskins_data.items():
        print(f"\n{char_name}:")
        
        existing = existing_skins.get(char_name, set())
        
        for skin_data in skin_list:
            skin_name = skin_data['skin_name']
            skin_id = skin_data['skin_id']
            char_id = skin_data['char_id']
            
            if skin_name not in existing:
                # New skin found!
                new_entry = {
                    "name": char_name,
                    "id": char_id,
                    "skinid": skin_id,
                    "skin_name": skin_name
                }
                new_entries.append(new_entry)
                
                print(f"  ✨ NEW: {skin_name} (ID: {skin_id})")
            else:
                print(f"  ✓ Exists: {skin_name}")
    
    return new_entries

def main():
    """Main execution."""
    print("=" * 80)
    print("RIVALSKINS.COM DATA MAPPER")
    print("=" * 80)
    print("\n⚠️  SAFE MODE: This script will NOT modify your existing character_data.json")
    print("   It will create a separate 'new_skins.json' file for review\n")
    
    # Load existing data
    json_path = Path(__file__).parent.parent / "src" / "data" / "character_data.json"
    
    if not json_path.exists():
        print(f"❌ Error: {json_path} not found!")
        return
    
    print(f"📂 Loading existing data from {json_path} (READ-ONLY)...")
    existing_data = load_existing_data(str(json_path))
    print(f"   Loaded {len(existing_data)} existing entries")
    
    # Fetch rivalskins data
    print("\n🌐 Fetching data from rivalskins.com...")
    rivalskins_data = fetch_rivalskins_data()
    
    if not rivalskins_data:
        print("❌ No data fetched from rivalskins.com")
        return
    
    # Compare and generate new entries
    new_entries = compare_and_generate(existing_data, rivalskins_data)
    
    # Save new entries to a separate file for review
    if new_entries:
        output_path = Path(__file__).parent / "new_skins.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(new_entries, f, indent=4, ensure_ascii=False)
        
        print(f"\n" + "=" * 80)
        print(f"✅ Found {len(new_entries)} new skins!")
        print(f"📝 NEW FILE CREATED: {output_path}")
        print(f"\n⚠️  Your original character_data.json was NOT modified!")
        print(f"   Review new_skins.json and manually merge the entries you want.")
        print("=" * 80)
    else:
        print(f"\n" + "=" * 80)
        print("✅ No new skins found - your data is up to date!")
        print("=" * 80)

if __name__ == "__main__":
    main()
