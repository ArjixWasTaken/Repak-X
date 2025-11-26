# Character Data Update Scripts

This directory contains scripts to help update the `character_data.json` file with data from rivalskins.com.

## Setup

1. Install required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Automatic Update (if API is available)
```bash
python update_character_data.py
```

### Manual Mapping Helper
```bash
python map_rivalskins_data.py
```

## Important Notes

The relationship between rivalskins.com item IDs and the game's internal character/skin IDs is not straightforward:

- **rivalskins.com item IDs**: Sequential database IDs (e.g., 1228, 1229, etc.)
- **Game character IDs**: Internal game IDs (e.g., 1011 for Hulk, 1022 for Captain America)
- **Game skin IDs**: Character ID + variant code (e.g., 1011001 for Hulk Default, 1011100 for Hulk variant)

### Skin ID Format
The skin IDs follow this pattern:
- `CCCCVVV` where:
  - `CCCC` = Character ID (4 digits)
  - `VVV` = Variant code (3 digits)
  
Examples:
- `1011001` = Hulk (1011) Default (001)
- `1011100` = Hulk (1011) First variant (100)
- `1011500` = Hulk (1011) Epic variant (500)

### Variant Code Patterns
- `001` = Default skin
- `100-199` = Rare skins
- `300-399` = Epic skins
- `500-599` = Legendary skins
- `800-899` = MCU/Movie skins

## Workflow

Since rivalskins.com doesn't directly expose the game's internal IDs, you'll need to:

1. **Run the scraper** to get skin names from rivalskins.com
2. **Manually map** the skin names to your existing character IDs
3. **Determine skin IDs** based on rarity/type patterns
4. **Update** the JSON file

The script will help automate step 1 and provide guidance for steps 2-4.
