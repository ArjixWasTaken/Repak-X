# Quick Start Guide: Updating Character Data from Rivalskins.com

## 📍 Data Source
The script fetches costume data from: **https://rivalskins.com/?type=costume**

## 🚀 Fast Update Process

### Step 1: Install Dependencies
```bash
cd scripts
pip install -r requirements.txt
```

### Step 2: Run the Mapping Script
```bash
python map_rivalskins_data.py
```

This will:
- ✅ Fetch all skins from rivalskins.com
- ✅ Compare with your existing `character_data.json`
- ✅ Identify new skins
- ✅ Suggest skin IDs based on patterns
- ✅ Generate `new_skins.json` with suggested entries

### Step 3: Review and Merge
1. Open `new_skins.json` to review the suggested entries
2. Verify the suggested skin IDs are correct
3. Manually merge into `../src/data/character_data.json`

## 📋 Example Output

```json
[
    {
        "name": "Spider-Man",
        "id": "1036",
        "skinid": "1036503",
        "skin_name": "Marvel's Spider-Man 2"
    },
    {
        "name": "Daredevil",
        "id": "1055",
        "skinid": "1055001",
        "skin_name": "Default"
    }
]
```

## 🔍 Understanding Skin IDs

The script uses these patterns to suggest IDs:

| Skin Type | ID Range | Examples |
|-----------|----------|----------|
| Default | `XXX001` | `1036001` |
| Rare | `XXX100-199` | `1036100`, `1036101` |
| Epic | `XXX300-399` | `1036300`, `1036301` |
| Legendary | `XXX500-599` | `1036500`, `1036501` |
| MCU/Movie | `XXX800-899` | `1036800`, `1036801` |

Where `XXX` is the character ID (e.g., `1036` for Spider-Man).

## ⚠️ Important Notes

1. **Verify IDs**: The script suggests IDs based on patterns, but you should verify them against the actual game files
2. **Character IDs**: If a new character appears on rivalskins.com, you'll need to add their ID to `CHARACTER_IDS` in the script
3. **Backup**: The script doesn't modify your original JSON - it creates a separate file for review

## 🔄 Regular Updates

To keep your data current:

```bash
# Run weekly or when new skins are released
python map_rivalskins_data.py

# Review new_skins.json
# Merge approved entries into character_data.json
```

## 🛠️ Troubleshooting

### "No data fetched from rivalskins.com"
- Check your internet connection
- The website structure may have changed - inspect the HTML manually

### "Unknown character ID"
- Add the new character to `CHARACTER_IDS` in `map_rivalskins_data.py`
- Determine the character ID from game files

### Duplicate skin IDs
- Manually adjust the suggested ID
- Ensure the ID doesn't conflict with existing entries
