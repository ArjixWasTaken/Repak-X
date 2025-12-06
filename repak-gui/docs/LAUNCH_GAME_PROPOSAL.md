# Launch Game Feature Proposal

## Overview
The user requested a "Play" button to launch Marvel Rivals directly from the Repak GUI.
Since this requires executing a system command (opening a `steam://` URL), it involves backend configuration changes in Tauri that are outside the scope of a purely frontend update.

## Technical Requirements

To enable this feature, we need to use the `@tauri-apps/plugin-shell` to execute the system's default URL handler for the `steam://` protocol.

### 1. Backend Configuration (`tauri.conf.json`)

We must explicitly allow the `shell` plugin to execute the `open` command (or equivalent) with the Steam URL.

**Required Changes in `src-tauri/tauri.conf.json` (or `capabilities/default.json`):**

```json
{
  "permissions": [
    {
      "identifier": "shell:open",
      "allow": [
        {
          "href": "steam://run/2767030"
        }
      ]
    }
  ]
}
```

*Note: The exact configuration syntax depends on the Tauri version (v1 vs v2). Repak GUI appears to be using Tauri v2 based on the `plugin-shell` usage.*

### 2. Frontend Implementation (`App.jsx`)

Once the backend is configured, the frontend code would look like this:

```javascript
import { open } from '@tauri-apps/plugin-shell';

// ... inside component ...

const handleLaunchGame = async () => {
  try {
    await open('steam://run/2767030');
    // Optional: Set "Game Running" state automatically
    setGameRunning(true);
  } catch (error) {
    console.error('Failed to launch game:', error);
    alert('Failed to launch game. Please ensure Steam is installed.');
  }
};
```

## Security Implications
- Enabling `shell:open` allows the application to open external URLs.
- We should restrict the allowed URLs to `steam://run/2767030` to prevent potential misuse if the frontend were compromised (though unlikely in this local app context).

## Next Steps
1.  **Approve Backend Changes**: Confirm that modifying the Tauri capabilities is acceptable.
2.  **Apply Configuration**: Update `repak-gui/capabilities/default.json` or `tauri.conf.json` to include the shell permission.
3.  **Update Frontend**: Replace the placeholder `alert()` in `App.jsx` with the actual `open()` call.
