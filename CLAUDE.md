# Audio Transcriber — Trigger.dev + Groq + Cloudflare R2

## What This App Does
Drag-and-drop interface where users upload audio/video files. Trigger.dev runs a background job that sends the file to Groq's Whisper API for transcription and returns the text.

## Architecture
```
Browser (Next.js) → Gets presigned URL from API → Uploads directly to Cloudflare R2
API route → Triggers background task on Trigger.dev
Trigger.dev task → Downloads file from R2 → Extracts audio with ffmpeg → Sends to Groq Whisper → Deletes file from R2 → Returns transcript
Browser polls /api/transcribe/status until done → Displays transcript
```

## Project Structure
```
src/app/page.tsx                       — Frontend UI (drag-and-drop, polling, display)
src/app/api/upload/route.ts            — Presigned URL generator for R2 direct upload
src/app/api/transcribe/route.ts        — Receives R2 key, triggers Trigger.dev task
src/app/api/transcribe/status/route.ts — Polls Trigger.dev for task status
src/trigger/transcribe.ts              — THE BACKGROUND JOB: downloads from R2, extracts audio, sends to Groq, deletes from R2
trigger.config.ts                      — Trigger.dev config (includes ffmpeg build extension)
.env.local                             — Local env vars (not committed)
```

## Key IDs & Config
- **Trigger.dev project ref:** `proj_iagefbsubfntlbkpbbuc`
- **Vercel team:** `king-koopas-projects`
- **Vercel project:** `trigger-dev`
- **Live URL:** https://trigger-dev-tau.vercel.app

## Environment Variables
All secrets are in .env.local (local) or set via Vercel/Trigger.dev dashboards (prod). NEVER put actual keys in this file.

### Needed in Vercel (production):
- `GROQ_API_KEY` — from Groq dashboard
- `TRIGGER_SECRET_KEY` — from Trigger.dev dashboard
- `R2_ACCESS_KEY_ID` — from Cloudflare R2 dashboard
- `R2_SECRET_ACCESS_KEY` — from Cloudflare R2 dashboard
- `R2_BUCKET_NAME` — R2 bucket name
- `R2_ACCOUNT_ID` — Cloudflare account ID

### Needed in Trigger.dev (prod environment):
- `GROQ_API_KEY` — same key as Vercel
- `R2_ACCESS_KEY_ID` — same as Vercel
- `R2_SECRET_ACCESS_KEY` — same as Vercel
- `R2_BUCKET_NAME` — same as Vercel
- `R2_ACCOUNT_ID` — same as Vercel

## Deployment Commands
- **Website:** `npx vercel --prod --scope king-koopas-projects --yes`
- **Trigger.dev worker:** `npx trigger deploy --env prod`
- **Local dev:** `npm run dev` (website) + `npx trigger dev` (worker)

## User Context
- User is non-technical, coming from a Zapier background
- Explain things simply, avoid jargon
