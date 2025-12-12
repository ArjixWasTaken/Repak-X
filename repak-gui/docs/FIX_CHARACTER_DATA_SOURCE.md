# Fix: ModDetailsPanel Using Wrong Character Data Source

## Problem

`ModDetailsPanel.jsx` imports character data from the **bundled static file** instead of the **Roaming folder**.

**Current (incorrect):**
```javascript
// Line 5 in ModDetailsPanel.jsx
import characterData from '../data/character_data.json'
```

This means any updates to character data (via GitHub sync or manual edits) in the Roaming folder (`%APPDATA%/RepakGuiRevamped/character_data.json`) are **ignored** by the details panel.

---

## Affected Functions

1. **`detectHeroes(files)`** - Line 266
   - Uses `characterData.find(c => c.id === id)` to map hero IDs to names

2. **`getHeroImage(heroName)`** - Line 287
   - Uses `characterData.find(c => heroName.includes(c.name))` to find character info for images

---

## Solution

### Step 1: Remove Static Import

Delete line 5:
```javascript
import characterData from '../data/character_data.json'
```

### Step 2: Add State for Character Data

Add state to hold the fetched character data:
```javascript
const [characterData, setCharacterData] = useState([])
```

### Step 3: Fetch Data from Backend on Mount

Add a `useEffect` to fetch character data from the Roaming folder via the backend:
```javascript
useEffect(() => {
  const loadCharacterData = async () => {
    try {
      const data = await invoke('get_character_data')
      setCharacterData(data)
    } catch (err) {
      console.error('Failed to load character data:', err)
      setCharacterData([])
    }
  }
  loadCharacterData()
}, [])
```

### Step 4: Update Helper Functions

The `detectHeroes` and `getHeroImage` functions need access to the state. Two options:

**Option A: Move functions inside the component**
- Convert them to use the `characterData` state directly
- Pass `characterData` as a parameter to the functions

**Option B: Use a shared context/store**
- Create a `CharacterDataContext` that fetches and provides the data app-wide
- This is better if multiple components need character data

### Step 5: Handle Loading State

Since data is now async, handle the case where `characterData` is empty/loading:
```javascript
const heroesList = useMemo(() => {
  if (details && details.files && characterData.length > 0) {
    return detectHeroes(details.files, characterData)
  }
  return []
}, [details, characterData])
```

---

## Backend Command Reference

The backend already exposes the correct command:
```rust
#[tauri::command]
async fn get_character_data() -> Result<Vec<character_data::CharacterSkin>, String> {
    Ok(character_data::get_all_character_data())
}
```

This loads from:
1. **Primary:** `%APPDATA%/RepakGuiRevamped/character_data.json`
2. **Fallback:** Bundled `data/character_data.json` (only if Roaming file doesn't exist)

---

## Files to Modify

- `repak-gui/src/components/ModDetailsPanel.jsx`

---

## Optional: Listen for Updates

To refresh when character data is updated (e.g., after GitHub sync):
```javascript
import { listen } from '@tauri-apps/api/event'

useEffect(() => {
  const unlisten = listen('character_data_updated', () => {
    // Re-fetch character data
    invoke('get_character_data').then(setCharacterData)
  })
  
  return () => { unlisten.then(fn => fn()) }
}, [])
```
