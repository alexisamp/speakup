# SpeakUp MCP Server

Gives Claude Code access to your SpeakUp practice data for analysis and coaching.

## Setup

### 1. Install and build

```bash
cd /Users/alexi/Documents/speakup/mcp
npm install
npm run build
```

### 2. Find your user key

Open the SpeakUp app in your browser and run this in the console:

```js
localStorage.getItem("speakup_user_id")
```

### 3. Add to Claude Code

```bash
claude mcp add speakup -- \
  env SUPABASE_URL=https://yevrugruwvawmowdbpkm.supabase.co \
  SUPABASE_KEY=sb_publishable_58Ix41IwzPBCQxS_GjL6VA_dCJ5hHrw \
  SPEAKUP_USER_KEY=<your-user-key-from-step-2> \
  node /Users/alexi/Documents/speakup/mcp/dist/index.js
```

`SPEAKUP_USER_KEY` is optional — omit it to query all users (fine for personal use).

## Available tools

| Tool | Description |
|------|-------------|
| `get_sessions` | Practice sessions with scores, duration, and feedback |
| `get_vocabulary` | Tracked phrases ordered by frequency (times_seen) |
| `get_streak` | Current day streak (10+ min sessions only) |
| `get_transcripts` | Full transcripts for recent sessions |
| `get_progress_summary` | Totals, avg scores (7d/30d), top 3 errors |

## Example prompts

Once the MCP server is connected, try:

- "What are my most common English mistakes?"
- "How has my score trended over the last 2 weeks?"
- "Give me a coaching plan based on my recent sessions"
- "What should I focus on in my next practice session?"
