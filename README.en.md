# Claude Code Reset Timer

[한국어](README.md) | **English**

A dashboard that visualizes the 5-hour / 7-day usage limit reset schedule for Claude Code.
Runs locally via Docker, collecting usage data through Claude Code statusline + JSONL transcripts.

> **Target**: Claude **Pro** / **Max** subscribers

## Key Features

- **Real-time countdown** — Time remaining until the next 5-hour / 7-day reset
- **Actual usage display** — `used_percentage` collected from statusline shown as a progress bar (LIVE)
- **Usage trend chart** — Token usage per 5-hour window + usage rate overlay
- **Weekly/Monthly calendar** — Past token usage bars at each reset time
- **Recent resets** — Past 3 + current + future 3 windows with usage/token dual display
- **Session history** — Token usage aggregated by project/session
- **Auto-calibration** — Automatically adjusts reset times using `resets_at` from the server

## Requirements

- **Docker** (Docker Desktop or Docker Engine)
- **Claude Code** CLI installed and logged in
- **OS**: Linux, macOS, Windows (WSL or Git Bash)

> **Windows**: `setup.sh` is a bash script — run it in **WSL** or **Git Bash**.
> Docker volume mount paths (`~/.claude`) work most reliably in WSL.

## Installation

```bash
git clone https://github.com/crazy77/claude-reset-time claude-reset-time
cd claude-reset-time
./setup.sh
```

What `setup.sh` does automatically:
1. Installs `statusline.sh` to `~/.claude/`
2. Registers the statusLine hook in `~/.claude/settings.json`
3. Builds Docker image and runs the container

After completion, visit **http://localhost:3456**.

> **Important**: You must **start a new Claude Code session** after installation for data collection to begin.
> The statusline is not triggered in sessions that were already running.
>
> ```bash
> claude    # Start a new session in the terminal
> ```
>
> Once you send your first message, the statusline is invoked and **LIVE** indicator appears on the dashboard.

<details>
<summary>Manual installation (without setup.sh)</summary>

```bash
# 1. Copy statusline script
cp statusline.sh ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh

# 2. Add statusLine to settings.json (using jq, preserves existing settings)
jq '. + { "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" } }' \
  ~/.claude/settings.json > /tmp/settings.json && mv /tmp/settings.json ~/.claude/settings.json

# 3. Run Docker
docker compose up -d --build
```

</details>

## Usage

```bash
docker compose up -d          # Start
docker compose down           # Stop
docker compose up -d --build  # Rebuild
docker compose logs -f        # Logs
```

<details>
<summary>Local development (without Docker)</summary>

```bash
npm install
npm run dev    # http://localhost:3000
```

</details>

## Language Support

The dashboard supports multiple languages. Access via URL path:
- Korean: `http://localhost:3456/ko`
- English: `http://localhost:3456/en`

The language is automatically detected from your browser's `Accept-Language` header.

## Architecture

```
Claude Code Session
    │  stdin (JSON)
    ▼
~/.claude/statusline.sh ──▶ usage-latest.json    (real-time usage)
                          └▶ usage-history.jsonl  (usage history)

~/.claude/projects/**/*.jsonl ──▶ Per-session token usage (past history)

        Docker Volume Mount (~/.claude → /claude-data:ro)
                    ▼
             Next.js API Routes
             /api/usage/current   ← Real-time usage
             /api/usage/history   ← Usage history
             /api/usage/windows   ← Per-window token aggregation
             /api/sessions        ← Session details
                    ▼
             http://localhost:3456
```

## Data Sources

| Data | Source | Description |
|------|--------|-------------|
| 5h/7d usage rate | statusline | Current window real-time %, updated when session is active |
| Reset time calibration | statusline `resets_at` | Auto-calibrated to user's actual server reset time |
| Per-window tokens | JSONL transcripts | Input/output token aggregation per 5-hour window |
| Per-session details | JSONL transcripts | Tokens, message count per project/session |
| Usage trend | `usage-history.jsonl` | Accumulated at ~1min intervals by statusline |

- **Current window**: statusline LIVE → auto-invalidated on expiry
- **Past windows**: statusline history → falls back to JSONL tokens if unavailable

## Project Structure

```
├── setup.sh                  # Auto-install script
├── docker-compose.yml        # Docker config (port 3456, ~/.claude mount)
├── Dockerfile                # Multi-stage standalone build
├── statusline.sh             # Statusline collection script
└── src/
    ├── app/
    │   ├── [lang]/
    │   │   ├── layout.tsx     # i18n root layout
    │   │   └── page.tsx       # Main dashboard
    │   ├── api/
    │   │   ├── usage/
    │   │   │   ├── current/   # Real-time usage
    │   │   │   ├── history/   # Statusline history
    │   │   │   └── windows/   # Per-window token aggregation
    │   │   └── sessions/      # Session details
    │   └── globals.css        # Dark theme styles
    ├── components/
    │   ├── CurrentStatus.tsx   # 5-hour window hero
    │   ├── WeeklyStatus.tsx    # 7-day window
    │   ├── UsageChart.tsx      # Usage trend chart
    │   ├── SessionHistory.tsx  # Session history
    │   ├── UpcomingResets.tsx   # Recent resets (past 3 + current + future 3)
    │   ├── WeekView.tsx        # Weekly timeline + token bars
    │   └── MonthView.tsx       # Monthly calendar + daily tokens
    ├── hooks/
    │   └── useUsageData.ts     # API polling hooks
    ├── i18n/
    │   ├── dictionaries/       # ko.json, en.json
    │   ├── context.tsx         # DictionaryProvider + useDict hook
    │   └── getDictionary.ts    # Server-side dictionary loader
    ├── lib/
    │   ├── resetTimes.ts       # Reset time calculation + auto-calibration
    │   └── types.ts            # Type definitions
    └── proxy.ts                # Locale detection + redirect
```

## Tech Stack

- **Next.js 16** (App Router, standalone output)
- **Tailwind CSS v4**
- **TypeScript**
- **Docker** (node:24-alpine multi-stage build)
