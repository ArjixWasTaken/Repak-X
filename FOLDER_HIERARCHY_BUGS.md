# Folder Hierarchy System - Critical Bugs Analysis

## Date: December 6, 2024
## Project: Repak GUI Revamped (Tauri Update)

---

## Executive Summary

Two critical bugs have been identified in the folder hierarchy system that prevent proper nested subdirectory display and mod movement functionality:

1. **Subdirectory Display Bug**: Nested folders (e.g., `Category/Subcategory`) appear flat under root instead of properly nested. This is because `FolderTree.jsx` splits `folder.name` (just "Subcategory") instead of `folder.id` ("Category/Subcategory"). Additionally, mods in nested folders don't appear when selecting parent folders due to exact string matching in filter logic.

2. **Root Movement Bug**: Mods cannot be moved to the root `~mods` folder - attempting to do so results in "Folder does not exist" error because the backend tries to create path `~mods/~mods/` instead of just `~mods/`

---

## Quick Fix Reference

### Bug #1 - Fix folder tree display in `FolderTree.jsx`:

**Part A - Line 13:** Use `folder.id` instead of `folder.name`:
```javascript
// Change from:
const parts = folder.name.split(/[/\\]/);

// To:
const parts = folder.id.split(/[/\\]/);
```

**Part B - Line 176-180:** Filter out root folder and display separately:
```javascript
// Add at start of FolderTree component:
const rootFolder = useMemo(() => folders.find(f => f.is_root), [folders]);
const subfolders = useMemo(() => folders.filter(f => !f.is_root), [folders]);

// Change buildTree call:
const root = buildTree(subfolders);  // Instead of buildTree(folders)
```

**Part C - Line 200+:** Display root folder with subfolders as children (see full code in Fix 1b below)

**AND** fix filtering in `App.jsx` (line 935):
```javascript
// Change from:
if (mod.folder_id !== selectedFolderId) return false

// To:
if (mod.folder_id !== selectedFolderId && 
    !mod.folder_id?.startsWith(selectedFolderId + '/')) return false
```

### Bug #2 - Add check in `main_tauri.rs` `assign_mod_to_folder` (line 1383):
```rust
let dest_path = if let Some(folder_name) = folder_id {
    let root_folder_name = game_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    
    if folder_name == root_folder_name {
        game_path.join(filename)  // Moving to root
    } else {
        let folder_path = game_path.join(&folder_name);
        if !folder_path.exists() {
            return Err("Folder does not exist".to_string());
        }
        folder_path.join(filename)
    }
} else {
    game_path.join(filename)
};
```

---

## Bug #1: Nested Subdirectory Display Issue

### Problem Description
Nested folders appear **flat** under root instead of showing proper hierarchy. For example:

**Expected UI:**
```
📁 All Mods
📁 ~mods
  📁 Category
    📁 Subcategory
  📁 DMC
  📁 Valox
```

**Actual UI (BROKEN):**
```
📁 All Mods
📁 ~mods
📁 Category
📁 Subcategory  ← Should be nested under Category!
📁 DMC
📁 Valox
```

Additionally, mods in nested subdirectories don't appear when selecting parent folders.

### Root Cause Analysis

#### Backend (Rust) - `main_tauri.rs`

**File**: `e:\WindsurfCoding\repak_rivals-remastered\Repak_Gui-Revamped-TauriUpdate\repak-gui\src\main_tauri.rs`

**Lines 258-270** - Mod folder assignment logic:
```rust
let folder_id = if let Some(parent) = path.parent() {
    if parent == game_path {
        // Mod is directly in root - use root folder name (e.g., "~mods")
        Some(root_folder_name)
    } else {
        // Mod is in a subfolder - use relative path from game_path as ID
        parent.strip_prefix(game_path)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .ok()
    }
} else {
    Some(root_folder_name)
};
```

**Issue**: This code correctly generates the folder_id as a relative path (e.g., `"Category/Subcategory"`), which matches the folder IDs generated in `get_folders()`.

**Lines 1227-1289** - Folder scanning logic:
```rust
for entry in WalkDir::new(game_path)
    .min_depth(1)
    .into_iter()
    .filter_map(|e| e.ok()) 
{
    let path = entry.path();
    
    if path.is_dir() {
        // Calculate relative path from game_path to get ID
        let relative_path = path.strip_prefix(game_path)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| "Unknown".to_string());
            
        // ...
        
        folders.push(ModFolder {
            id: relative_path, // ID is the relative path (e.g. "Category/Subcategory")
            name,
            enabled: true,
            expanded: true,
            color: None,
            depth,
            parent_id,
            is_root: false,
            mod_count,
        });
    }
}
```

**Issue**: The folder IDs are correctly set as relative paths.

#### Frontend (React) - `App.jsx`

**File**: `e:\WindsurfCoding\repak_rivals-remastered\Repak_Gui-Revamped-TauriUpdate\repak-gui\src\App.jsx`

**Lines 932-936** - Folder filtering logic:
```javascript
const filteredMods = mods.filter(mod => {
    // Folder filter
    if (selectedFolderId !== 'all') {
      if (mod.folder_id !== selectedFolderId) return false
    }
    // ...
});
```

**Issue**: This uses **exact string matching** (`!==`). For a mod in `Category/Subcategory`, its `folder_id` is `"Category/Subcategory"`. However, when a user selects the `Category` folder in the UI, `selectedFolderId` becomes `"Category"`, not `"Category/Subcategory"`.

**Lines 1315-1318** - Folder count calculation:
```javascript
getCount={(id) => {
    if (id === 'all') return filteredMods.length;
    return filteredMods.filter(m => m.folder_id === id).length;
}}
```

**Issue**: Same exact matching problem. When counting mods for `"Category"`, it won't count mods in `"Category/Subcategory"`.

#### Frontend (React) - `FolderTree.jsx`

**File**: `e:\WindsurfCoding\repak_rivals-remastered\Repak_Gui-Revamped-TauriUpdate\repak-gui\src\components\FolderTree.jsx`

**Lines 5-37** - Tree building logic:
```javascript
const buildTree = (folders) => {
  const root = { id: 'root', name: 'root', children: {}, isVirtual: true };
  
  sortedFolders.forEach(folder => {
    // Split by '/' or '\'
    const parts = folder.name.split(/[/\\]/);  // ❌ WRONG!
    let current = root;
    
    parts.forEach((part, index) => {
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          children: {},
          isVirtual: true,
          fullPath: parts.slice(0, index + 1).join('/')
        };
      }
      current = current.children[part];
      
      // If this is the last part, it's the actual folder
      if (index === parts.length - 1) {
        current.id = folder.id;
        current.isVirtual = false;
        current.originalName = folder.name;
      }
    });
  });
  
  return root;
};
```

**Critical Issue**: 
- Line 13 splits `folder.name` by `/` or `\`
- Backend sends `name: "Subcategory"` (just the folder name), NOT `"Category/Subcategory"`
- Backend sends `id: "Category/Subcategory"` (full path) and `parent_id: "Category"`
- The tree builder should use `folder.id` (which contains the full path) instead of `folder.name`
- Result: All folders appear flat under root because splitting `"Subcategory"` gives just one part

### The Core Problem

**Mismatch between folder selection and mod filtering:**

1. Backend correctly assigns `folder_id = "Category/Subcategory"` to mods
2. Backend correctly creates folder with `id = "Category/Subcategory"` and `name = "Subcategory"`
3. Frontend tree builder tries to split `folder.name` but gets confused
4. When user clicks on `"Category"` folder, `selectedFolderId = "Category"`
5. Filtering logic checks `mod.folder_id === selectedFolderId` → `"Category/Subcategory" === "Category"` → **FALSE**
6. Mods in nested folders are never displayed when parent folder is selected

### Required Fix

**Fix 1a: Correct the tree building logic in `FolderTree.jsx`**

Change line 13 to use `folder.id` instead of `folder.name`:

```javascript
const buildTree = (folders) => {
  const root = { id: 'root', name: 'root', children: {}, isVirtual: true };
  
  // Sort folders by ID to ensure consistent tree building
  const sortedFolders = [...folders].sort((a, b) => a.id.localeCompare(b.id));

  sortedFolders.forEach(folder => {
    // Split by '/' or '\' - use folder.id which has the full path
    const parts = folder.id.split(/[/\\]/);  // ✅ FIXED: Use folder.id instead of folder.name
    let current = root;
    
    parts.forEach((part, index) => {
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          children: {},
          isVirtual: true,
          fullPath: parts.slice(0, index + 1).join('/')
        };
      }
      current = current.children[part];
      
      // If this is the last part, it's the actual folder
      if (index === parts.length - 1) {
        current.id = folder.id;
        current.isVirtual = false;
        current.originalName = folder.name;
        current.name = folder.name; // Use the actual folder name for display
      }
    });
  });
  
  return root;
};
```

**Fix 1b: Filter out root folder and display it separately in `FolderTree.jsx`**

The root folder (`~mods`) is currently being processed by `buildTree()` and appears at the same level as subfolders. It should be filtered out and displayed separately as the parent of all subfolders.

In the `FolderTree` component (around line 176), change:

```javascript
// BEFORE:
const FolderTree = ({ folders, selectedFolderId, onSelect, onDelete, getCount, hasFilters }) => {
  const treeData = useMemo(() => {
    const root = buildTree(folders);
    return convertToArray(root);
  }, [folders]);

  return (
    <div className="file-tree" style={{ padding: 0 }}>
      {/* All Mods Root Node */}
      <div className="tree-node">
        {/* ... All Mods display ... */}
      </div>

      {treeData.map(node => (
        <FolderNode /* ... */ />
      ))}
    </div>
  );
};
```

```javascript
// AFTER:
const FolderTree = ({ folders, selectedFolderId, onSelect, onDelete, getCount, hasFilters }) => {
  // Separate root folder from subfolders
  const rootFolder = useMemo(() => folders.find(f => f.is_root), [folders]);
  const subfolders = useMemo(() => folders.filter(f => !f.is_root), [folders]);
  
  const treeData = useMemo(() => {
    const root = buildTree(subfolders);  // ✅ Only build tree from subfolders
    return convertToArray(root);
  }, [subfolders]);

  return (
    <div className="file-tree" style={{ padding: 0 }}>
      {/* All Mods Root Node */}
      <div className="tree-node">
        <div 
            className={`node-content ${selectedFolderId === 'all' ? 'selected' : ''}`}
            onClick={() => onSelect('all')}
            style={{ paddingLeft: '24px', paddingRight: '8px' }}
        >
            <span className="node-icon folder-icon">
                <VscLibrary />
            </span>
            <span className="node-label">All Mods</span>
            <span className="folder-count" style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '8px' }}>
                {getCount('all')}
            </span>
        </div>
      </div>

      {/* Root Folder (~mods) - Display separately */}
      {rootFolder && (
        <div className="tree-node">
          <div 
              className={`node-content ${selectedFolderId === rootFolder.id ? 'selected' : ''}`}
              onClick={() => onSelect(rootFolder.id)}
              style={{ paddingLeft: '24px', paddingRight: '8px' }}
          >
              <span className="node-icon folder-icon">
                  {selectedFolderId === rootFolder.id ? <VscFolderOpened /> : <VscFolder />}
              </span>
              <span className="node-label">{rootFolder.name}</span>
              <span className="folder-count" style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '8px' }}>
                  {getCount(rootFolder.id)}
              </span>
          </div>
          
          {/* Render subfolders as children of root */}
          <div className="node-children">
            {treeData.map(node => (
              <FolderNode
                  key={node.fullPath || node.id}
                  node={node}
                  selectedFolderId={selectedFolderId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  getCount={getCount}
                  hasFilters={hasFilters}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

**What this does:**
- Filters out the root folder (identified by `is_root: true`) from the folders array
- Builds the tree only from subfolders
- Displays the root folder as a special node with all subfolders nested underneath it
- Result: `~mods` appears at the top level with proper hierarchy below it

**Fix 2: Hierarchical Filtering in `App.jsx`**

Modify the filtering logic to check if a mod's `folder_id` **starts with** the selected folder path:

```javascript
// In App.jsx, lines 932-936
const filteredMods = mods.filter(mod => {
    // Folder filter
    if (selectedFolderId !== 'all') {
        // Check if mod is in selected folder OR any of its subfolders
        if (mod.folder_id !== selectedFolderId && 
            !mod.folder_id?.startsWith(selectedFolderId + '/')) {
            return false;
        }
    }
    // ...
});
```

**Fix 3: Count Calculation Fix in `App.jsx`**

```javascript
getCount={(id) => {
    if (id === 'all') return filteredMods.length;
    // Count mods in this folder AND all subfolders
    return filteredMods.filter(m => 
        m.folder_id === id || m.folder_id?.startsWith(id + '/')
    ).length;
}}
```

---

## Bug #2: Cannot Move Mods to Root Folder

### Problem Description
Mods located in subdirectories cannot be moved back to the root `~mods` folder. When users try to move a mod to the `~mods` folder shown in the folder list, they get an error: **"Folder does not exist"**.

### Root Cause Analysis

#### Backend (Rust) - `main_tauri.rs`

**File**: `e:\WindsurfCoding\repak_rivals-remastered\Repak_Gui-Revamped-TauriUpdate\repak-gui\src\main_tauri.rs`

**Lines 1213-1224** - Root folder creation:
```rust
// Add root folder first (depth 0) - use actual folder name as ID
folders.push(ModFolder {
    id: root_name.clone(),  // Use actual name like "~mods" as ID
    name: root_name.clone(),
    enabled: true,
    expanded: true,
    color: None,
    depth: 0,
    parent_id: None,
    is_root: true,
    mod_count: root_mod_count,
});
```

**Issue**: The root folder is given `id: "~mods"` (the folder name), which makes it appear in the folder list alongside actual subfolders.

**Lines 1367-1414** - `assign_mod_to_folder` function:
```rust
let dest_path = if let Some(folder_name) = folder_id {
    // Move to folder
    let folder_path = game_path.join(&folder_name);
    if !folder_path.exists() {
        return Err("Folder does not exist".to_string());
    }
    folder_path.join(filename)
} else {
    // Move back to root ~mods directory
    game_path.join(filename)
};
```

**Critical Issue**: 
- When `folder_id = Some("~mods")`, the code does `game_path.join("~mods")`
- If `game_path` is `C:\Game\~mods\`, this creates `C:\Game\~mods\~mods\` - **which doesn't exist!**
- The code only moves to root when `folder_id = None`, but the UI always passes `Some("~mods")`

#### Frontend (React) - `App.jsx`

**Lines 773-783** - `handleMoveSingleMod` function:
```javascript
const handleMoveSingleMod = async (modPath, folderId) => {
    if (gameRunning) {
      setStatus('Cannot move mods while game is running')
      return
    }
    try {
      await invoke('assign_mod_to_folder', { modPath, folderId })
      setStatus('Mod moved to folder')
      await loadMods()
      await loadFolders()
    } catch (error) {
      setStatus(`Error moving mod: ${error}`)
    }
}
```

**Issue**: This function always passes `folderId` as a string. There's no way to pass `null` or `undefined` to indicate "move to root".

#### Frontend (React) - `ContextMenu.jsx`

**File**: `e:\WindsurfCoding\repak_rivals-remastered\Repak_Gui-Revamped-TauriUpdate\repak-gui\src\components\ContextMenu.jsx`

**Line 4** - Context menu definition:
```javascript
const ContextMenu = ({ x, y, mod, onClose, onAssignTag, onMoveTo, onCreateFolder, folders, onDelete, onToggle, allTags }) => {
```

**Issue**: The context menu receives a `folders` prop and likely displays them in a dropdown/submenu, but there's no option to select "Move to Root" or pass `null` as the folder ID.

#### Frontend (React) - `App.jsx`

**Lines 1385-1400** - Bulk move dropdown:
```javascript
<select
   className="toolbar-select"
   disabled={selectedMods.size === 0}
   defaultValue=""
   onChange={(e) => {
     const folderId = e.target.value
     if (!folderId) return
     handleAssignToFolder(folderId)
     e.target.value = ''
   }}
 >
   <option value="">Move to...</option>
   {folders.map(f => (
     <option key={f.id} value={f.id}>{f.name}</option>
   ))}
</select>
```

**Issue**: 
1. The dropdown only shows folders, not a "Root" option
2. The `if (!folderId) return` check prevents moving to root even if we added an option with `value=""`

### The Core Problem

**Root folder ID mismatch causes path construction error:**

1. Root folder is created with `id: "~mods"` (the folder name)
2. When user selects `~mods` from UI, frontend passes `folder_id: "~mods"`
3. Backend does `game_path.join("~mods")` → `C:\Game\~mods\~mods\` → **doesn't exist!**
4. Backend only moves to root when `folder_id: None`, but UI never passes `None`

### Required Fix

**Solution: Check if folder_id matches root folder name in backend**

Modify `assign_mod_to_folder` in `main_tauri.rs` (lines 1383-1393):

```rust
let dest_path = if let Some(folder_name) = folder_id {
    // Check if this is the root folder (folder_name matches game_path's name)
    let root_folder_name = game_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    
    if folder_name == root_folder_name {
        // Moving to root - don't join the path
        game_path.join(filename)
    } else {
        // Move to subfolder
        let folder_path = game_path.join(&folder_name);
        if !folder_path.exists() {
            return Err("Folder does not exist".to_string());
        }
        folder_path.join(filename)
    }
} else {
    // Move back to root ~mods directory
    game_path.join(filename)
};
```

**Alternative Solution: Use special root ID**

Change root folder ID to a special value like `"__ROOT__"` instead of the folder name:

In `get_folders()` (line 1215):
```rust
folders.push(ModFolder {
    id: "__ROOT__".to_string(),  // Special ID for root
    name: root_name.clone(),     // Display name is still "~mods"
    // ... rest of fields
});
```

Then in `assign_mod_to_folder`:
```rust
let dest_path = if let Some(folder_name) = folder_id {
    if folder_name == "__ROOT__" {
        // Moving to root
        game_path.join(filename)
    } else {
        // Move to subfolder
        let folder_path = game_path.join(&folder_name);
        if !folder_path.exists() {
            return Err("Folder does not exist".to_string());
        }
        folder_path.join(filename)
    }
} else {
    game_path.join(filename)
};
```

And update mod assignment in `get_pak_files()` (line 261):
```rust
let folder_id = if let Some(parent) = path.parent() {
    if parent == game_path {
        Some("__ROOT__".to_string())  // Use special root ID
    } else {
        parent.strip_prefix(game_path)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .ok()
    }
} else {
    Some("__ROOT__".to_string())
};
```

---

## Testing Checklist

After implementing fixes, test the following scenarios:

### Bug #1 Testing:
- [ ] Create folder structure: `~mods/Category/Subcategory/`
- [ ] Place mod in `Subcategory`
- [ ] Select `Category` folder in UI
- [ ] Verify mod appears in the list
- [ ] Verify folder count shows correct number
- [ ] Select `Subcategory` folder in UI
- [ ] Verify mod still appears
- [ ] Test with 3+ levels of nesting

### Bug #2 Testing:
- [ ] Place mod in `~mods/Category/`
- [ ] Right-click mod → "Move to..." → Select "Root"
- [ ] Verify mod moves to `~mods/`
- [ ] Verify mod appears when "All Mods" is selected
- [ ] Test bulk move: Select multiple mods → "Move to..." → "Root"
- [ ] Verify all mods move to root
- [ ] Test moving from nested folder (e.g., `Category/Subcategory`) to root
- [ ] Verify IoStore files (.utoc, .ucas) also move

---

## Additional Considerations

### Performance
- The hierarchical filtering approach (Option 1) is more performant than recursive collection (Option 2)
- Use `startsWith()` with proper path separator handling to avoid false matches (e.g., "Cat" shouldn't match "Category")

### Edge Cases
- **Empty folder names**: Handle folders with empty or whitespace-only names
- **Special characters**: Test with folder names containing `/`, `\`, or other special characters
- **Case sensitivity**: Ensure path matching is case-insensitive on Windows, case-sensitive on Linux
- **Root folder ID**: The root folder uses the actual folder name (e.g., "~mods") as its ID, not an empty string

### UI/UX Improvements
- Add visual indication when viewing a folder and its subfolders (e.g., "Category (including subfolders)")
- Add breadcrumb navigation to show current folder path
- Add "Move to parent folder" quick action
- Show folder path in mod details panel

---

## Priority

**Critical**: Both bugs significantly impact usability and should be fixed before the next release.

**Estimated Effort**:
- Bug #1: 2-3 hours (requires careful testing of edge cases)
- Bug #2: 1-2 hours (mostly frontend changes)

---

## Related Files

### Backend (Rust)
- `repak-gui/src/main_tauri.rs` - Lines 218-336 (mod loading), 1227-1289 (folder scanning), 1367-1414 (mod movement)
- `repak-gui/src/app_state.rs` - Lines 84-89 (ModFolder struct), 96-98 (ModEntry struct)

### Frontend (React)
- `repak-gui/src/App.jsx` - Lines 932-993 (filtering logic), 773-783 (move handler), 1315-1318 (count calculation), 1385-1400 (bulk move UI)
- `repak-gui/src/components/FolderTree.jsx` - Lines 5-37 (tree building), 51-174 (folder node rendering)
- `repak-gui/src/components/ContextMenu.jsx` - Context menu implementation

---

## Notes for Implementers

1. **Test thoroughly**: These changes affect core functionality. Test with various folder structures and edge cases.
2. **Maintain backwards compatibility**: Ensure existing single-level folders still work correctly.
3. **Update documentation**: Document the folder hierarchy system and how folder IDs work.
4. **Consider refactoring**: The folder ID system (using relative paths) is correct, but could be made more explicit with better naming.

---

**Document prepared for forwarding to development team**
**No implementation changes made - analysis only**
