# Audio Transcriber — Trigger.dev + Groq + Cloudflare R2

## What This App Does
Drag-and-drop interface where users upload audio/video files of any size. Trigger.dev runs a background job that sends the file to Groq's Whisper API for transcription and returns the text.

## Architecture
```
Browser (Next.js) → Gets presigned URL from API → Uploads directly to Cloudflare R2
API route → Triggers background task on Trigger.dev
Trigger.dev task → Streams file from R2 to disk → Extracts audio with ffmpeg → Splits if >24MB → Sends to Groq Whisper → Deletes file from R2 → Returns transcript
Browser polls /api/transcribe/status until done → Displays transcript
```

## Project Structure
```
src/app/page.tsx                       — Frontend UI (drag-and-drop, upload progress bar, polling, display)
src/app/api/upload/route.ts            — Presigned URL generator for R2 direct upload (path-style, no checksums)
src/app/api/transcribe/route.ts        — Receives R2 key, triggers Trigger.dev task
src/app/api/transcribe/status/route.ts — Polls Trigger.dev for task status
src/trigger/transcribe.ts              — THE BACKGROUND JOB: streams from R2, extracts audio, sends to Groq, deletes from R2
trigger.config.ts                      — Trigger.dev config (includes ffmpeg build extension)
.env.local                             — Local env vars (not committed)
```

## Key IDs & Config
- **Trigger.dev project ref:** `proj_iagefbsubfntlbkpbbuc`
- **Vercel team:** `king-koopas-projects`
- **Vercel project:** `trigger-dev`
- **Live URL:** https://trigger-dev-tau.vercel.app
- **GitHub:** https://github.com/koopazz/audio-transcriber
- **Cloudflare R2 bucket:** `audio-transcriber`
- **Cloudflare account ID:** `5239225ac4f2e42faf9e933598fa9647`

## Environment Variables
All secrets are in .env.local (local) or set via Vercel/Trigger.dev dashboards (prod). NEVER put actual keys in this file.

### Needed in Vercel (production):
- `GROQ_API_KEY` — from Groq dashboard
- `TRIGGER_SECRET_KEY` — from Trigger.dev dashboard
- `R2_ACCESS_KEY_ID` — from Cloudflare R2 dashboard
- `R2_SECRET_ACCESS_KEY` — from Cloudflare R2 dashboard
- `R2_BUCKET_NAME` — `audio-transcriber`
- `R2_ACCOUNT_ID` — Cloudflare account ID
- `R2_ENDPOINT` — `https://<account-id>.r2.cloudflarestorage.com`

### Needed in Trigger.dev (prod environment):
- `GROQ_API_KEY` — same key as Vercel
- `R2_ACCESS_KEY_ID` — same as Vercel
- `R2_SECRET_ACCESS_KEY` — same as Vercel
- `R2_BUCKET_NAME` — same as Vercel
- `R2_ACCOUNT_ID` — same as Vercel
- `R2_ENDPOINT` — same as Vercel

## Deployment
- **Website auto-deploys** from GitHub (connected to Vercel)
- **Trigger.dev worker:** `npx trigger deploy --env prod`
- **Local dev:** `npm run dev` (website) + `npx trigger dev` (worker)

## Key Technical Decisions
- **R2 over Vercel Blob:** Vercel Blob has a 500MB file limit on free tier. R2 has no practical limit.
- **Presigned URLs:** Browser uploads directly to R2 — file never touches our server. Avoids Vercel's 4.5MB serverless body limit.
- **Path-style URLs + no checksums:** R2 requires `forcePathStyle: true` and `requestChecksumCalculation: "WHEN_REQUIRED"` in the S3 client config.
- **Stream to disk:** Trigger.dev task streams the R2 download to disk instead of loading into RAM. Prevents OOM on large files.
- **large-2x machine:** Needed for ffmpeg to process large video files without running out of memory.
- **Auto-delete from R2:** File is deleted immediately after transcription — zero ongoing storage costs.
- **CORS on R2:** Bucket has CORS configured via `wrangler r2 bucket cors set` using Cloudflare's native format (`allowed.origins`, not `AllowedOrigins`).
- **Env vars via printf:** When piping env vars to `vercel env add`, use `printf '%s'` not `echo` — echo adds trailing newlines that corrupt presigned URL signatures.

## User Context
- User is non-technical, coming from a Zapier background
- Explain things simply, avoid jargon
