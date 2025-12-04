# IoStore & PAK-Only UI Changes Needed

## Overview
The backend now properly detects IoStore mods (.pak + .utoc + .ucas) and Audio/Movie mods that should stay as PAK-only. The UI needs to be updated to show clear visual indicators for the installation method.

## Backend Changes Completed

### 1. InstallableModInfo Structure (main_tauri.rs)
Added two new fields to the `InstallableModInfo` struct:
```rust
iostore: bool,  // True if this is an IoStore mod (.pak + .utoc + .ucas)
repak: bool,    // True if this should go through repak workflow
```

### 2. Mod Type Indicators (install_mod.rs)
The `mod_type` field now includes visual indicators:
- **IoStore mods**: `"<ModType> (IoStore)"` - e.g., "Character (IoStore)"
- **Audio/Movie mods**: `"<ModType> (PAK Only)"` - e.g., "Audio (PAK Only)"
- **Regular mods**: Just the type name - e.g., "Character"

### 3. Auto-Detection Logic
- IoStore mods: `repak = false`, `iostore = true`
- Audio/Movie mods: `repak = false`, `iostore = false`
- Regular mods: `repak = true`, `iostore = false`

## UI Changes Needed in InstallModPanel.jsx

### 1. Add Installation Method Column
Add a new column between "Type" and "Fix Mesh" to show the installation method:

```jsx
<thead>
  <tr>
    <th>Mod Name</th>
    <th>Type</th>
    <th>Install Method</th>  {/* NEW COLUMN */}
    <th>Fix Mesh</th>
    <th>Fix Texture</th>
    <th>Fix SerializeSize</th>
    <th>To Repak</th>
  </tr>
</thead>
```

### 2. Display Installation Method
In the table body, add a cell that shows the installation method with appropriate styling:

```jsx
<td>
  {mod.iostore ? (
    <span className="install-method iostore">Copy IoStore</span>
  ) : mod.repak ? (
    <span className="install-method convert">Convert to IoStore</span>
  ) : (
    <span className="install-method pak-only">Copy PAK Only</span>
  )}
</td>
```

### 3. Disable "To Repak" Checkbox for IoStore and PAK-Only Mods
Update the "To Repak" checkbox to be disabled when it shouldn't be changed:

```jsx
<td>
  <input
    type="checkbox"
    checked={modSettings[idx]?.toRepak || false}
    onChange={(e) => updateModSetting(idx, 'toRepak', e.target.checked)}
    disabled={mod.iostore || !mod.repak}  {/* DISABLE FOR IOSTORE AND PAK-ONLY */}
  />
</td>
```

### 4. Add Tooltip/Help Text
Add a tooltip or help icon to explain the installation methods:

```jsx
<th>
  Install Method
  <span className="help-icon" title="How this mod will be installed:
    • Copy IoStore: Directly copies .pak, .utoc, .ucas files
    • Convert to IoStore: Converts to IoStore format
    • Copy PAK Only: Copies as regular .pak file (Audio/Movie mods)">
    ⓘ
  </span>
</th>
```

## CSS Styling Needed in InstallModPanel.css

Add styling for the installation method indicators:

```css
.install-method {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.install-method.iostore {
  background-color: #3b82f6;  /* Blue */
  color: white;
}

.install-method.convert {
  background-color: #10b981;  /* Green */
  color: white;
}

.install-method.pak-only {
  background-color: #f59e0b;  /* Orange */
  color: white;
}

.help-icon {
  margin-left: 4px;
  cursor: help;
  opacity: 0.7;
  font-size: 14px;
}

.help-icon:hover {
  opacity: 1;
}
```

## Expected Behavior

### IoStore Mods (Archive with .pak + .utoc + .ucas)
- **Type**: Shows "(IoStore)" suffix
- **Install Method**: "Copy IoStore" (blue badge)
- **To Repak**: Checkbox disabled and unchecked
- **Action**: Files will be copied directly to mod directory

### Audio/Movie Mods (PAK Only)
- **Type**: Shows "(PAK Only)" suffix
- **Install Method**: "Copy PAK Only" (orange badge)
- **To Repak**: Checkbox disabled and unchecked
- **Action**: PAK file will be copied without IoStore conversion

### Regular Mods
- **Type**: No suffix
- **Install Method**: "Convert to IoStore" (green badge)
- **To Repak**: Checkbox enabled and checked by default
- **Action**: Will be converted to IoStore format

## Testing Scenarios

1. **Drop an archive with IoStore files**:
   - Should show "Copy IoStore" method
   - Type should show "(IoStore)"
   - To Repak should be disabled

2. **Drop a sound/movie mod**:
   - Should show "Copy PAK Only" method
   - Type should show "(PAK Only)"
   - To Repak should be disabled

3. **Drop a regular character mod**:
   - Should show "Convert to IoStore" method
   - Type should show no suffix
   - To Repak should be enabled and checked

## Notes

- The backend properly detects IoStore mods by checking for companion .utoc and .ucas files
- Audio/Movie detection is currently based on the mod type string containing "Audio" or "Movies"
- TODO comment exists in the code for implementing proper Audio/Movie detection criteria
- The `repak` field controls whether the mod goes through the repak workflow or gets copied directly
