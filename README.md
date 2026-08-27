# Standup Generator

## The Problem

Every morning I spent 10–15 minutes staring at Slack trying to piece together what I did the day before to write my standup. I'd scroll through commits, check Notion, dig through conversation threads — then still end up with a one-liner like "worked on auth stuff." My team lead would ask follow-up questions every single time. The real problem wasn't laziness — I was context-switching between 3–4 tasks daily, and by the next morning the details were already gone. I built this tool so I can brain-dump my messy notes from the day — commits, task descriptions, random phrases — and get a clean, professional 3-section standup in seconds, ready to paste into Slack.

## What It Does

Paste your raw notes from the day (commit messages, task names, half-sentences — anything). The tool sends them to an AI on the backend, which structures them into a professional 3-section standup: ✅ Done, 🔄 Doing Today, ⚠️ Blockers. The output is formatted for Slack and is copy-paste ready. No account needed, no storage, no friction.

## AI Integration

**API:** OpenRouter  
**Model:** `openai/gpt-4o-mini`  
**Location:** `backend/server.js` → `generateStandup()` function  
**What the AI does:** Transforms unstructured daily notes into a structured, professional 3-section engineering standup in the standard Done / Doing / Blockers format.

## What I Intentionally Excluded

- **No user accounts / login** — The tool is fully session-based. Adding auth would require a database, session management, and password resets — easily 3–4x more code. The core value (quick standup, no friction) doesn't need persistence. Users get the output, copy it, done.
- **No history / saved standups** — Storing past standups would require a database and raise privacy questions (standups can contain sensitive project info). The marginal value of history doesn't justify storing work activity data.
- **No team features / Slack bot integration** — Direct Slack posting would require OAuth, a Slack app review, and workspace permissions. A simple copy button achieves 90% of the value at 1% of the complexity.

## Monthly Cost Calculation

```
Model:  openai/gpt-4o-mini
Input token rate:  $0.15 per 1M tokens
Output token rate: $0.60 per 1M tokens

Average tokens per call:
  Input:  ~700 tokens  (system prompt ~400 + user notes ~300)
  Output: ~250 tokens  (3-section standup)

Cost per call:
  Input:  (700 / 1,000,000) × $0.15  = $0.000105
  Output: (250 / 1,000,000) × $0.60  = $0.000150
  Total per call:                      $0.000255

Expected calls/month: 200
  (roughly 10 developers × 20 working days)

Monthly total: 200 × $0.000255 = $0.051  (~$0.05/month)
```

## Live Deployment

**Frontend:** https://albusdumbeldore2007.github.io/standup-generator  
**Backend:** https://standup-generator-backend.onrender.com

## Local Development

```bash
# Backend
cd backend
cp .env.example .env      # add your OpenRouter key
npm install
npm start                 # runs on http://localhost:3000

# Frontend
cd frontend
npx serve .               # or open index.html with Live Server
```

> **Note:** Update `BACKEND_URL` in `frontend/script.js` to `http://localhost:3000` for local testing.
