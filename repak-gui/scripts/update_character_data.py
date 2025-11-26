"""
Script to scrape Marvel Rivals character and skin data from rivalskins.com
and update the character_data.json file.

Usage:
    python update_character_data.py
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from pathlib import Path
from typing import List, Dict

# Base URL for the website
BASE_URL = "https://rivalskins.com"

def fetch_page(url: str) -> BeautifulSoup:
    """Fetch and parse a webpage."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return BeautifulSoup(response.content, 'html.parser')

def extract_character_data() -> List[Dict]:
    """
    Extract character and skin data from rivalskins.com
    Returns a list of dictionaries matching the existing JSON format.
    """
    character_data = []
    
    # Try to fetch the main skins page
    try:
        soup = fetch_page(f"{BASE_URL}/skins")
        
        # Look for character links or skin items
        # This will need to be adjusted based on the actual HTML structure
        skin_items = soup.find_all('a', href=re.compile(r'/item/\d+/'))
        
        for item in skin_items:
            href = item.get('href', '')
            # Extract item ID from URL (e.g., /item/1228/captain-america-costume-captain-klyntar/)
            match = re.search(r'/item/(\d+)/', href)
            if match:
                item_id = match.group(1)
                
                # Get the item name from the link text or title
                item_name = item.get_text(strip=True)
                
                # Try to extract character name and skin name
                # This is a heuristic and may need adjustment
                parts = item_name.split('-', 1)
                if len(parts) == 2:
                    character_name = parts[0].strip()
                    skin_name = parts[1].strip()
                else:
                    character_name = item_name
                    skin_name = "Default"
                
                # Note: We need to determine the character ID and skin ID
                # This may require visiting individual item pages
                print(f"Found: {character_name} - {skin_name} (Item ID: {item_id})")
        
    except Exception as e:
        print(f"Error fetching data: {e}")
    
    return character_data

def fetch_character_pages() -> List[Dict]:
    """
    Alternative approach: Fetch individual character pages.
    """
    character_data = []
    
    # List of known characters (you can expand this)
    characters = [
        "hulk", "punisher", "storm", "loki", "human-torch", "doctor-strange",
        "mantis", "hawkeye", "captain-america", "rocket-raccoon", "hela",
        "cloak-and-dagger", "black-panther", "groot", "ultron", "magik",
        "moon-knight", "luna-snow", "squirrel-girl", "black-widow", "iron-man",
        "venom", "spider-man", "magneto", "scarlet-witch", "thor",
        "mister-fantastic", "winter-soldier", "peni-parker", "star-lord",
        "blade", "namor", "adam-warlock", "jeff-the-landshark", "psylocke",
        "wolverine", "invisible-woman", "the-thing", "iron-fist", "emma-frost",
        "phoenix", "angela", "daredevil"
    ]
    
    for char_slug in characters:
        try:
            url = f"{BASE_URL}/hero/{char_slug}"
            print(f"Fetching {url}...")
            soup = fetch_page(url)
            
            # Extract character name
            char_name_elem = soup.find('h1')
            if char_name_elem:
                char_name = char_name_elem.get_text(strip=True)
            else:
                char_name = char_slug.replace('-', ' ').title()
            
            # Look for skin items on the character page
            skin_links = soup.find_all('a', href=re.compile(r'/item/\d+/.*-costume-'))
            
            for link in skin_links:
                href = link.get('href', '')
                # Extract skin details from URL
                match = re.search(r'/item/(\d+)/(.*-costume-(.*))', href)
                if match:
                    item_id = match.group(1)
                    skin_slug = match.group(3).replace('/', '')
                    skin_name = link.get_text(strip=True) or skin_slug.replace('-', ' ').title()
                    
                    print(f"  - {skin_name} (Item ID: {item_id})")
                    
                    # Note: We still need to map item IDs to character IDs and skin IDs
                    # This requires additional data or reverse engineering
            
        except Exception as e:
            print(f"Error fetching {char_slug}: {e}")
    
    return character_data

def scrape_with_api() -> List[Dict]:
    """
    Check if rivalskins.com has an API endpoint we can use.
    """
    try:
        # Try common API endpoints
        api_urls = [
            f"{BASE_URL}/api/items",
            f"{BASE_URL}/api/skins",
            f"{BASE_URL}/api/heroes",
        ]
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
        
        for api_url in api_urls:
            try:
                print(f"Trying API endpoint: {api_url}")
                response = requests.get(api_url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    print(f"Success! Found API at {api_url}")
                    print(f"Sample data: {json.dumps(data[:2] if isinstance(data, list) else data, indent=2)}")
                    return data
            except:
                continue
                
    except Exception as e:
        print(f"No API found: {e}")
    
    return []

def update_character_json(new_data: List[Dict], output_path: str):
    """
    Update the character_data.json file with new data.
    """
    output_file = Path(output_path)
    
    # Backup existing file
    if output_file.exists():
        backup_path = output_file.with_suffix('.json.backup')
        output_file.rename(backup_path)
        print(f"Backed up existing file to {backup_path}")
    
    # Write new data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, indent=4, ensure_ascii=False)
    
    print(f"Updated {output_file} with {len(new_data)} entries")

def main():
    """Main execution function."""
    print("=" * 60)
    print("Marvel Rivals Character Data Updater")
    print("=" * 60)
    
    # First, try to find an API
    print("\n1. Checking for API endpoints...")
    api_data = scrape_with_api()
    
    if api_data:
        print("\nFound API data! Processing...")
        # Process API data here
    else:
        print("\nNo API found. Attempting web scraping...")
        
        # Try character pages
        print("\n2. Fetching character pages...")
        character_data = fetch_character_pages()
        
        if character_data:
            # Update the JSON file
            json_path = Path(__file__).parent.parent / "src" / "data" / "character_data.json"
            update_character_json(character_data, str(json_path))
        else:
            print("\nNo data extracted. The website structure may have changed.")
            print("Manual inspection required.")
    
    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)

if __name__ == "__main__":
    main()
