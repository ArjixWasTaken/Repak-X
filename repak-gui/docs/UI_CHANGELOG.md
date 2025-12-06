# Changelog - UI & Functionality Overhaul

## Update - Recursive Folders & Header Polish (Dec 6, 2025)

### Header & Navigation
- **Layout**: Rearranged header elements for better visual flow.
  - Moved "Game Running" indicator before the "Share" button.
  - Moved "Check Conflicts" button to the main action bar (before view switcher).
  - Replaced the "Settings" emoji button with a standard Gear Icon.
- **Mod Count**: Moved the total mod count to the header title (greyed out) for a cleaner look.
- **Launch Game**: Added a "Play" button to the header (currently a placeholder linking to the proposal).

### Sidebar & Navigation
- **Recursive Folder Tree**: Replaced the flat folder list with a new `FolderTree` component.
- **Virtual Nesting**: Implemented client-side parsing of folder names (e.g., "Category/Subcategory") to display a nested hierarchy without backend changes.
- **Resizing**: Updated the resize logic for the right panel (Min: 25%, Max: 40%, Default: 30%).

### Components
- **Tooltip**: Implemented a custom `Tooltip` component (HeroUI style) to replace default browser tooltips.

### Bug Fixes
- **Mod Details Panel**: Fixed a crash/stale error state when deleting or moving the currently selected mod.
- **Root Folder Move**: Fixed an issue where moving mods to the root folder (e.g., `~mods`) would fail with "Folder does not exist" due to incorrect path resolution in the backend call.

### Documentation
- **Proposals**: Added `LAUNCH_GAME_PROPOSAL.md` detailing the backend requirements for the game launcher feature.

## Update - Sharing UI & Visual Polish (Dec 4, 2025)

### Sharing Panel Overhaul
- **Layout**: Redesigned the "Share Mods" tab into a side-by-side grid layout.
  - **Left**: Pack details form (Name, Description, Creator).
  - **Right**: Scrollable mod selection list with a new **Search Bar**.
- **UX**: Cleaned up mod names in the selection list (hiding `_9999999_P` suffixes and extensions).
- **Styling**: Moved sharing-specific styles to `src/components/SharingPanel.css`.

### Additive Categories (Blueprint & Text)
- **Logic**: Implemented frontend support for "Blueprint" and "Text" as additive categories.
- **Parsing**: Added fallback logic to extract these categories from the `mod_type` string (e.g., "Blade - Mesh [Blueprint]") even if the backend metadata is incomplete.
- **Filtering**: Updated the main filter system to correctly categorize mods with these additive tags.

### Multi-Character Support
- **Display**: Added support for mods affecting multiple heroes (e.g., "Multiple Heroes - Mesh").
- **Tooltip**: Implemented a hover tooltip to list all affected characters when "Multiple Heroes" is detected.
- **Styling**: Added specific styling for the multi-hero badge and tooltip in `ModDetailsPanel.css`.

### Visual Polish & Refactoring
- **Category Colors**: Implemented distinct color coding for all main mod categories (Mesh=Cyan, VFX=Orange, Audio=Green, UI=Pink, etc.) instead of using the generic accent color.
- **Console Font**: Updated the installation log panel to use a monospace font (`Consolas`, `Monaco`) for better readability of file paths.
- **CSS Architecture**:
  - Extracted badge styles to `src/styles/Badges.css`.
  - Extracted font definitions to `src/styles/Fonts.css`.

## Update - Nested Folders & Theming (Dec 2, 2025)

### Nested Folder Support (Proposal)
- **Status**: Implementation details documented in `SUBFOLDER_SUPPORT_PROPOSAL.md` (Pending Backend Approval).
- **Proposed Features**: Recursive directory scanning, nested folder creation, and hierarchical UI rendering.

### UI & Theming
- **Context Menu**: Added scrollbar to "Move to..." menu for better handling of many folders.
- **White Theme Fixes**: Replaced hardcoded dark colors with CSS variables in `theme.css`, `App.css`, and `InstallModPanel.css`.
- **Bulk Actions**: Styled the "Move to..." dropdown in the toolbar to match the theme.
- **Cleanup**: Removed the artificial "Ungrouped" folder; mods in the root are now displayed under "Root".

### Functionality
- **File Watcher**: Implemented auto-refresh. The app now detects external file changes (add/remove/modify) and updates the mod list automatically.
- **Multi-Select**: Added `Ctrl + Click` support on mod names to toggle selection for bulk actions.

## (Dec 1, 2025)
## Layout & Design
### Global Layout Rework
- **Structure**: Implemented a new 3-pane layout for better usability:
  - **Left Panel**: Folder tree navigation and filtering options.
  - **Right Panel**: Dedicated Mod Details view.
  - **Top Bar**: Unified Search bar and "Install Mod" controls (redesigned from the old Game Path section).

### Mod List & Cards
- **View Switcher**: Added ability to toggle between different view modes:
  - **Big Cards**: Standard view.
  - **Small Cards**: Scaled down version for better screen density.
  - **Details List**: Compact list view.
- **Visual Cleanup**:
  - Removed package emojis from mod names.
  - Removed redundant "Enabled/Disabled" text next to toggle switches.
  - Designed a slimmer, less intrusive delete button.
  - Implemented smart text truncation for mod names to prevent layout clipping on smaller cards.

## Features & Logic
### Game State Safety
- **Game Running Detection**: Added real-time checks for game state.
- **Dev Toggle**: Added a developer toggle to simulate "Game Running" state for testing.
- **Safety Locks**: Disabled critical actions (Delete, Move, Toggle Mod) when the game is detected as running to prevent file corruption.

### Right-Click Context Menu
- **Implementation**: Added a fully custom right-click context menu.
- **Capabilities**:
  - **Move to Folder**: Submenu lists all existing folders + option to create a "New Folder".
  - **Assign Tag**: Submenu lists all available tags + option to create a "New Tag".
  - **Safety Delete**: Implemented a "Hold-to-Delete" interaction (2s timer) to prevent accidental deletions.

### Bug Fixes
- **Mod Deletion**: Fixed an issue where only `.pak` files were deleted. Backend now correctly removes the full IOStore set (`.pak`, `.ucas`, `.utoc`).

## Refactoring & Architecture
### Component Architecture
- **Modularization**: Extracted the context menu logic from `App.jsx` into a standalone component at `src/components/ContextMenu.jsx`.
- **Styling**: Moved all context-menu specific styles out of `App.css` and into `src/components/ContextMenu.css`.

### Backend Suggestions
- **Folder Structure**: Proposed update to `ModFolder` struct to support colors and future expansion:
  ```rust
  struct ModFolder {
      id: String,
      name: String,
      enabled: bool,
      expanded: bool,
      color: Option<[u8; 3]>,
  }
  ```