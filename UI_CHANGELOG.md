# Changelog - UI & Functionality Overhaul

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