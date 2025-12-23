# Toast Notifications Integration Guide

This document explains how to connect the Rust backend toast notification system to the JSX frontend `AlertHandler` component.

## Overview

The Rust backend emits toast notifications via Tauri events. The frontend needs to listen for these events and display them using the existing `AlertHandler` system.

### Event Names

| Event | Description |
|-------|-------------|
| `toast_notification` | General toast notifications (errors, warnings, info) |
| `game_crash_detected` | Specialized crash notifications with detailed error info |

---

## Rust Backend (Already Implemented)

The backend emits events from `src/toast_events.rs`:

### ToastPayload Structure
```rust
{
    "type": "danger" | "warning" | "success" | "primary" | "secondary" | "default",
    "title": "Error Title",
    "description": "Error description message",
    "duration": 5000  // Optional: milliseconds, 0 = persistent
}
```

### CrashToastPayload Structure (for `game_crash_detected`)
```rust
{
    "type": "danger",
    "title": "Game Crashed",
    "description": "Formatted error description",
    "duration": 0,
    "error_message": "Raw error from crash dump",
    "crash_type": "ObjectSerializationError",
    "asset_path": "/Game/Characters/1016/...",
    "details": "Serial size mismatch: ...",
    "character_id": "1016",
    "is_mesh_crash": true,
    "seconds_in_game": 45,
    "crash_folder": "C:\\Users\\...\\Crashes\\UE-..."
}
```

---

## Frontend Integration (Required Changes)

### Step 1: Add Event Listeners in App.jsx

Add the following imports and useEffect hook to listen for toast events:

```jsx
// At the top of App.jsx, ensure these imports exist:
import { listen } from '@tauri-apps/api/event';
import { useAlert } from './components/AlertHandler';

// Inside your main App component (or a component wrapped by AlertProvider):
function AppContent() {
    const alert = useAlert();

    useEffect(() => {
        // Listen for general toast notifications from Rust
        const unlistenToast = listen('toast_notification', (event) => {
            const { type, title, description, duration } = event.payload;
            
            // Map Rust type to AlertHandler color
            const colorMap = {
                'danger': 'danger',
                'warning': 'warning', 
                'success': 'success',
                'primary': 'primary',
                'secondary': 'secondary',
                'default': 'default'
            };
            
            alert.showAlert({
                color: colorMap[type] || 'default',
                title,
                description,
                duration: duration ?? 5000
            });
        });

        // Listen for crash notifications (special handling)
        const unlistenCrash = listen('game_crash_detected', (event) => {
            const payload = event.payload;
            
            // Show persistent error toast for crashes
            alert.showAlert({
                color: 'danger',
                title: payload.title || 'Game Crashed',
                description: payload.description,
                duration: 0, // Persistent - user must dismiss
                // You can add custom rendering for crash details if needed
            });
            
            // Optional: Log detailed crash info to console for debugging
            console.error('Game Crash Detected:', {
                crashType: payload.crash_type,
                assetPath: payload.asset_path,
                details: payload.details,
                isMeshCrash: payload.is_mesh_crash,
                crashFolder: payload.crash_folder
            });
        });

        // Cleanup listeners on unmount
        return () => {
            unlistenToast.then(fn => fn());
            unlistenCrash.then(fn => fn());
        };
    }, [alert]);

    // ... rest of component
}
```

### Step 2: Check for Previous Session Crashes on Startup

Call `check_for_previous_crash` when the app loads to detect crashes that occurred while the app wasn't running:

```jsx
// In App.jsx or a startup hook:
useEffect(() => {
    // Check for crashes from previous game sessions
    invoke('check_for_previous_crash').catch(err => {
        console.error('Failed to check for previous crashes:', err);
    });
}, []); // Run once on mount
```

### Step 3: Ensure AlertProvider Wraps the App

In `main.jsx` or your root component, ensure `AlertProvider` wraps everything:

```jsx
import { AlertProvider } from './components/AlertHandler';

function App() {
    return (
        <AlertProvider placement="bottom-center">
            <AppContent />
        </AlertProvider>
    );
}
```

---

## Complete Integration Example

Here's a complete example of the event listener setup:

```jsx
// In App.jsx or a dedicated ToastListener component

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useAlert } from './components/AlertHandler';

function ToastEventListener() {
    const alert = useAlert();

    useEffect(() => {
        // === TOAST NOTIFICATION LISTENER ===
        const unlistenToast = listen('toast_notification', (event) => {
            const { type, title, description, duration } = event.payload;
            
            alert.showAlert({
                color: type === 'danger' ? 'danger' : 
                       type === 'warning' ? 'warning' :
                       type === 'success' ? 'success' :
                       type === 'primary' ? 'primary' : 'default',
                title,
                description,
                duration: duration ?? 5000
            });
        });

        // === CRASH NOTIFICATION LISTENER ===
        const unlistenCrash = listen('game_crash_detected', (event) => {
            const { title, description, is_mesh_crash, asset_path, crash_type } = event.payload;
            
            // Build enhanced description for crashes
            let enhancedDesc = description;
            if (is_mesh_crash) {
                enhancedDesc += '\n\n💡 Tip: Try disabling "Fix Mesh" for this mod';
            }
            
            alert.showAlert({
                color: 'danger',
                title: title || 'Game Crashed',
                description: enhancedDesc,
                duration: 0 // Persistent
            });
        });

        // === CHECK FOR PREVIOUS SESSION CRASHES ===
        invoke('check_for_previous_crash').catch(console.error);

        return () => {
            unlistenToast.then(fn => fn());
            unlistenCrash.then(fn => fn());
        };
    }, [alert]);

    return null; // This component just sets up listeners
}

// Use in your app:
function App() {
    return (
        <AlertProvider placement="bottom-center">
            <ToastEventListener />
            {/* Rest of your app */}
        </AlertProvider>
    );
}
```

---

## Events Emitted by Rust Commands

The following Rust commands emit toast notifications on error:

| Command | Error Toast |
|---------|-------------|
| `delete_mod` | "Delete Failed" |
| `toggle_mod` | "Toggle Failed" |
| `rename_mod` | "Rename Failed" |
| `create_folder` | "Folder Error" |
| `delete_folder` | "Delete Failed" |
| `assign_mod_to_folder` | "Move Failed" |
| `auto_detect_game_path` | "Detection Failed" |
| `install_mods` | "Installation Failed" |
| `monitor_game_for_crashes` | "Game Crashed" (via `game_crash_detected` event) |
| `check_for_previous_crash` | "Game Crashed" (via `game_crash_detected` event) |

---

## AlertHandler API Reference

The `useAlert()` hook provides these methods:

```jsx
const alert = useAlert();

// Show a custom alert
alert.showAlert({
    color: 'danger',      // 'success' | 'danger' | 'warning' | 'primary' | 'secondary' | 'default'
    title: 'Error Title',
    description: 'Error message',
    duration: 5000        // ms, 0 = no auto-dismiss
});

// Convenience methods
alert.success('Title', 'Description');
alert.error('Title', 'Description');
alert.warning('Title', 'Description');
alert.info('Title', 'Description');

// Promise-based toast (shows loading → success/error)
alert.promise(asyncFunction, {
    loading: { title: 'Loading...', description: 'Please wait' },
    success: { title: 'Done!', description: 'Operation completed' },
    error: { title: 'Failed', description: 'Something went wrong' }
});

// Dismiss toasts
alert.dismissAlert(toastId);
alert.dismissAllAlerts();
```

---

## Testing

1. **Test error toasts**: Try deleting a mod that doesn't exist or renaming to a duplicate name
2. **Test crash detection**: 
   - Start the game with a broken mod
   - Wait for crash
   - Check that toast appears when game closes
3. **Test previous session crash**: 
   - Close the app
   - Start game and let it crash
   - Reopen the app - should show crash notification

---

## Files Reference

- **Rust Backend**: `repak-gui/src/toast_events.rs` - Toast payload definitions and emit functions
- **Rust Commands**: `repak-gui/src/main_tauri.rs` - Commands that emit toasts
- **Frontend Handler**: `repak-gui/src/components/AlertHandler.jsx` - Toast display component
