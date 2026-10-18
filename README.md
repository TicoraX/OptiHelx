# OptiHelx

**English** · [Español](README.es.md)

OptiHelx is a maintenance and optimization toolkit for Windows. It has 23 modules written in Node.js, one-click optimization profiles, a headless CLI, live hardware stats, a Health Score, a restore point manager, a command palette (`Ctrl+K`) and a React dashboard that runs as a desktop app (Tauri v2 or Electron) or in the browser.

> All processing and report storage happen on your machine. There is no cloud service and no telemetry. Only two modules reach the network: Update Checker queries the official package managers, and AdBlock downloads public domain lists.

## Modules

| Module | What it does |
|---|---|
| Update Checker | Checks winget (apps and drivers), pip, global npm and Chocolatey for updates in parallel. |
| Disk Cleanup | Scans and cleans temp files, the recycle bin, developer caches (`uv`, `pnpm`, `cargo`) and browser caches (Chrome, Edge, Firefox, Arc, Vivaldi, Opera). |
| Startup Optimizer | Audits and disables startup programs, auto-start services and logon tasks. Keeps a manifest to re-enable them and supports `dryRun`. |
| RAM Optimizer | Shows memory use per process and sorts processes by risk: safe, risky, or critical to the system. |
| Network Optimizer | Checks connectivity, latency, DNS cache size and network adapters. Can flush and re-register. |
| Services Optimizer | Lists automatic services, separating Microsoft from third-party ones. Can stop and disable the ones you pick. |
| Power Optimizer | Shows the active power plan, battery state and estimated draw. Switches plans and records the change so it can be undone. |
| App Manager | Lists installed apps through winget and uninstalls them silently in batches. |
| Privacy Optimizer | Audits and tightens Windows privacy policies (telemetry, advertising ID, Cortana, sensors, diagnostics). |
| AdBlock Optimizer | Blocks telemetry and ad domains by writing curated lists (`adaway`, `danpollock`, `stevenblack`) into the hosts file, with an automatic backup. |
| Gaming Mode | Tunes the system for games: HAGS, GameDVR, fullscreen optimizations, DirectStorage and GPU priority. |
| System Integrity | Runs SFC and DISM checks and repairs on the Windows component store with live progress. |
| Context Menu | Removes leftover and unneeded entries from the Windows context menu without touching the system ones. |
| OEM Debloat | Finds and disables preinstalled vendor software (Dell, HP, Lenovo, ASUS, Acer) without touching drivers. |
| System Timers | Adjusts interrupt latency and BCD clock settings (`useplatformclock`, `syntheticclock`, `tscsyncpolicy`). |
| Ghost Devices | Finds disconnected or duplicate devices in Device Manager and skips system buses (`PCI\`, `HTREE\`, `UEFI\`). |
| Search Indexer | Tunes the Windows Search service and turns off web and Bing results in the Start menu. |
| DNS Flush | Flushes the DNS resolver cache and re-registers host names. |
| Network Privacy | Turns off network protocols that leak data or are insecure (LLMNR, NetBIOS, WPAD, active NCSI probing). |
| Virtual Memory / Pagefile | Reports on the pagefile, kernel paging and memory management policies. |
| WerFault Optimizer | Suppresses crash dialogs, large minidump generation and Windows error telemetry. |
| SSD Health & TRIM | Reads SMART health for physical drives, checks that TRIM is on and runs `defrag.exe /O /C`. |
| GPU Shader Cache | Finds and clears DirectX, NVIDIA, AMD and Intel shader caches, which helps with stutter after a driver update. |

Every module follows the same pattern:

- Scan reads the system and writes a Markdown report, a JSON file of counts and a JSON file of selectable items. It changes nothing.
- Action only touches what you selected. You can preview it with `dryRun` first, and every applied change goes into a change log (`changes.json`) so you can undo it.

## Features

- One-click profiles for common setups (Gaming, Office, Laptop and battery, Developer). Each profile chains several actions and supports `dryRun`.
- A headless CLI (`server/cli.js`) runs diagnostics, cleanup, RAM optimization, TRIM and profiles from PowerShell or CMD.
- The Electron build minimizes to the system tray and offers quick actions from the tray icon menu.
- Live hardware stats: CPU (usage, cores, clock speed, history chart), RAM (used, free, live sparkline), free space per drive, and active network adapters with local IP and hostname.
- A command palette (`Ctrl+K` / `Cmd+K`) jumps to any module or view, toggles light and dark mode, and exports reports.
- A Health Score from 0 to 100 rates the overall state of the system, and Quick Optimize runs the safest modules in one click.
- Large Files Hunter finds big files (threshold selectable from 100 MB to 5 GB, 250 MB by default) and opens them in File Explorer.
- A restore point manager creates and lists Windows restore points. Windows itself allows at most one automatic restore point every 24 hours.

## CLI

The backend ships a CLI to run diagnostics and maintenance from a terminal:

```powershell
# Combined status of all modules
node server/cli.js status

# Health Score and recommended actions
node server/cli.js health

# List available profiles
node server/cli.js profiles

# Preview the Gaming profile without changing anything
node server/cli.js profile gaming --dry-run

# Apply the Gaming profile
node server/cli.js profile gaming

# Clean temp files
node server/cli.js clean

# Optimize RAM
node server/cli.js ram

# Run TRIM on SSDs
node server/cli.js trim

# Clear GPU shader caches
node server/cli.js shaders
```

## Project layout

```
OptiHelx/
├── server/
│   ├── server.js            # Express: routes, security, SSE, rate limiting
│   ├── cli.js               # Headless CLI
│   ├── lib/                 # Logic for the 23 modules, plain Node.js
│   │   ├── shared.js        # Module whitelist, validators, spawn helpers, change log
│   │   ├── changes.js       # Undo for applied changes
│   │   ├── status.js        # Combined status
│   │   ├── profiles.js      # Optimization profiles
│   │   ├── smartdisk.js     # SMART and TRIM module
│   │   ├── shadercache.js   # GPU shader cache module
│   │   └── <module>.js      # One file per module: scan + action
│   └── tests/               # Unit and integration tests
├── frontend/                # React + Vite
│   ├── src/modules.js       # Declarative registry of the 23 modules
│   ├── src/styles/tokens.css# Design tokens (color, spacing, type)
│   └── src/components/      # UI components
├── src-tauri/               # Tauri v2 desktop shell (bundles node.exe and the server)
├── electron/                # Electron desktop shell (tray, electron-updater)
├── scripts/Notify.ps1       # Scheduled weekly notifications
└── <module>/reports/        # Reports, counts, items, logs and change log
```

## Requirements

- Windows 10 or 11 (64-bit)
- [Node.js 20+](https://nodejs.org/) and `npm >= 9`
- For the Tauri build: the Rust toolchain
- Optional, depending on the module: `winget`, `pip`, `npm`, `choco`. Missing ones are skipped without an error.

## Quick start: desktop app

Clone and install:

```powershell
git clone https://github.com/TicoraX/OptiHelx.git
cd OptiHelx
npm ci                     # reproducible install from the lockfile
npm run build:frontend     # builds the frontend
```

Tauri v2 (the shell used for the v1.5.0 NSIS installer):

```powershell
npm run tauri:dev          # run in development
npm run tauri:build        # build the NSIS installer
```

Electron (tray icon and auto-update through GitHub Releases):

```powershell
npm start                  # opens the app
npm run dist               # builds the installer in dist/ without publishing
npm run release            # builds and publishes a GitHub Release (needs GITHUB_TOKEN with repo scope)
```

## Quick start: web server mode

To run only the backend and open the dashboard in your browser (`http://localhost:5173` in development, or `http://localhost:3001` with the static build):

```powershell
# Terminal 1: backend
cd server
npm start

# Terminal 2: frontend in development mode
cd frontend
npm run dev
```

## Security

1. The Express server binds to `127.0.0.1` only, so other machines on the LAN or the internet cannot reach it.
2. Commands run through `spawn()` with argument arrays and no shell. The one exception is global npm updates, which go through the shell because `npm` is a `.cmd` script on Windows.
3. Only the 23 modules registered in `MODULES` can run. Any other module name gets an HTTP 400.
4. Every file deletion resolves the path with `realpath` and checks that it sits inside an allowed folder (`%TEMP%`, caches and similar).
5. Every system change accepts a `dryRun` flag that shows what would change without changing it.
6. Every applied change stores its previous value in `changes.json`, so each one can be undone on its own.
7. Endpoints use `express-rate-limit` and `helmet` security headers.
