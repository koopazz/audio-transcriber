# Audio Transcriber — Trigger.dev + Groq + Vercel

## What This App Does
Drag-and-drop interface where users upload audio/video files. Trigger.dev runs a background job that sends the file to Groq's Whisper API for transcription and returns the text.

## Architecture
```
Browser (Next.js) → Upload file to Vercel Blob → Send URL to API route
API route → Triggers background task on Trigger.dev
Trigger.dev task → Downloads file from Blob → Extracts audio with ffmpeg → Sends to Groq Whisper → Returns transcript
Browser polls /api/transcribe/status until done → Displays transcript
```

## Project Structure
```
src/app/page.tsx                    — Frontend UI (drag-and-drop, polling, display)
src/app/api/upload/route.ts         — Vercel Blob upload handler (client upload protocol)
src/app/api/transcribe/route.ts     — Receives blob URL, triggers Trigger.dev task
src/app/api/transcribe/status/route.ts — Polls Trigger.dev for task status
src/trigger/transcribe.ts           — THE BACKGROUND JOB: downloads file, extracts audio via ffmpeg, sends to Groq Whisper
trigger.config.ts                   — Trigger.dev config (includes ffmpeg build extension)
.env.local                          — Local env vars (not committed)
```

## Key IDs & Config
- **Trigger.dev project ref:** `proj_iagefbsubfntlbkpbbuc`
- **Vercel team:** `king-koopas-projects`
- **Vercel project:** `trigger-dev`
- **Live URL:** https://trigger-dev-tau.vercel.app
- **Vercel Blob store:** `store_GZgE3w9o0XU1maMi` (name: "transcriber")

## Environment Variables

### Vercel (production):
- `GROQ_API_KEY` — Groq API key for Whisper transcription
- `TRIGGER_SECRET_KEY` — Trigger.dev production key
- `BLOB_READ_WRITE_TOKEN` — Auto-set by Vercel Blob store connection

### Trigger.dev (prod environment):
- `GROQ_API_KEY` — Set via API, same key as Vercel

### .env.local (local dev):
- `GROQ_API_KEY` — from Groq dashboard
- `TRIGGER_SECRET_KEY` — from Trigger.dev dashboard

## Deployment Commands
- **Website:** `npx vercel --prod --scope king-koopas-projects --yes`
- **Trigger.dev worker:** `npx trigger deploy --env prod`
- **Local dev:** `npm run dev` (website) + `npx trigger dev` (worker)

## User Context
- User is non-technical, coming from a Zapier background
- Explain things simply, avoid jargon
- User's email: tanaybuildscoolstuff@gmail.com
