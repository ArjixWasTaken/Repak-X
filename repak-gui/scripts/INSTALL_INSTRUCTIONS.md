# Installation Instructions

## Issue Detected
Python appears to be installed via Windows Store (stub version) which has access restrictions.

## Solution: Install Python Properly

### Step 1: Download Python
1. Go to https://www.python.org/downloads/
2. Download **Python 3.12** (or latest version)
3. Run the installer

### Step 2: During Installation
⚠️ **IMPORTANT**: Check these boxes:
- ✅ **"Add python.exe to PATH"** (at the bottom)
- ✅ **"Install for all users"** (if available)

### Step 3: After Installation
1. **Close and reopen** your terminal/PowerShell
2. Verify installation:
   ```powershell
   python --version
   ```
   Should show: `Python 3.12.x`

### Step 4: Install Dependencies
```powershell
cd c:\WindsurfCoding\Repak-Gui-Revamped\repak-gui\scripts
python -m pip install requests beautifulsoup4 lxml
```

### Step 5: Run the Script
```powershell
python map_rivalskins_data.py
```

---

## Alternative: Use Chocolatey (Package Manager)

If you have Chocolatey installed:
```powershell
choco install python -y
refreshenv
python -m pip install requests beautifulsoup4 lxml
```

---

## Quick Test After Installation

```powershell
# Test Python
python --version

# Test pip
python -m pip --version

# Install packages
python -m pip install requests beautifulsoup4 lxml

# Run script
python map_rivalskins_data.py
```

---

## Troubleshooting

### "python is not recognized"
- Restart your terminal
- Make sure you checked "Add to PATH" during installation
- Manually add Python to PATH in System Environment Variables

### "Access Denied" or "Permission Error"
- Run PowerShell as Administrator
- Or install Python in user directory (not Program Files)

### Still having issues?
You can manually update the JSON file by:
1. Visit https://rivalskins.com/skins
2. Look for new skins
3. Add them to `character_data.json` following the existing format
