# Arsh's Medication Manager

A medication tracker with two interfaces — a mobile-friendly web dashboard and a voice agent (ElevenLabs + Twilio) — both reading from and writing to the same database.

## Features

- **Dashboard** — big text, big buttons, soft colors. Shows today's meds by category with taken/pending status. Auto-refreshes every 30 seconds. PWA-ready (add to iPhone home screen).
- **Voice** — Arsh calls a phone number, the agent reads pending meds, she says what she took, it updates the database.
- **Categories** — Morning and Evening (one log per day, reset at midnight PT) and As Needed (log multiple times per day).

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env

# 3. Seed the database with example medications
npm run seed

# 4. Start the server
npm start
# → http://localhost:3000
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `./data/meds.db` | Path to SQLite file |

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Today's meds grouped by category |
| `POST` | `/api/take` | Log a medication as taken |
| `GET` | `/api/history?days=7` | Recent log history |
| `POST` | `/api/meds` | Add a medication |
| `DELETE` | `/api/meds/:id` | Remove a medication |

### POST /api/take

```json
{ "med_id": 1 }
// or by name (for the voice agent):
{ "med_name": "Metformin" }
```

### POST /api/meds

```json
{
  "name": "Aspirin 81mg",
  "category": "morning",
  "instructions": "Take with water"
}
```

Categories: `morning` | `evening` | `as_needed`

## Deploying to Railway

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/med-management.git
git push -u origin main
```

### 2. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `med-management` repo.
4. Railway will detect the Dockerfile and start building.

### 3. Add a persistent volume (critical for SQLite)

Without this, your database resets every time the app redeploys.

1. In your Railway project, click on the service.
2. Go to **Settings** → **Volumes**.
3. Click **Add Volume**.
4. Set **Mount Path** to `/data`.
5. Click **Add**.

### 4. Set environment variables

In Railway → your service → **Variables**, add:

```
DB_PATH=/data/meds.db
```

### 5. Seed the database

After first deploy, open Railway's **Shell** tab and run:

```bash
npm run seed
```

### 6. Get your URL

Railway gives you a URL like `https://med-management-production.up.railway.app`. That's the dashboard URL to put on Arsh's phone, and the base URL to paste into the ElevenLabs tool config.

---

## Adding to iPhone Home Screen

1. Open the dashboard URL in Safari.
2. Tap the **Share** button (box with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Name it "Meds" and tap **Add**.

It will appear on the home screen like a regular app.

---

## ElevenLabs + Twilio Setup

See [agent-setup.md](./agent-setup.md) for the full guide, including the system prompt to paste and the webhook tool definitions.

---

## Data Storage

All data lives in a single SQLite file (default `./data/meds.db`):

- `meds` — medication list (name, category, instructions)
- `med_logs` — every "taken" event with timestamp and PT date

The log file is the source of truth for both the dashboard and the voice agent. Nothing is deleted — medications are soft-deleted (`active = 0`) so history is preserved.
