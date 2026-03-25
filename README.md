# Audio Transcriber

Drop any audio or video file — get a transcript back. No file size limits.

**Live demo:** [trigger-dev-tau.vercel.app](https://trigger-dev-tau.vercel.app)

## How it works

1. You drag and drop a file (audio or video, any size)
2. It uploads directly to Cloudflare R2 from your browser
3. A [Trigger.dev](https://trigger.dev) background job picks it up
4. ffmpeg extracts the audio track (a 700MB video becomes ~80MB of audio)
5. [Groq's](https://groq.com) Whisper API transcribes it (splits into chunks if needed)
6. The file is deleted from storage immediately — nothing lingers
7. You get your transcript

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js (App Router) |
| File storage | Cloudflare R2 (via presigned URLs) |
| Background jobs | Trigger.dev |
| Transcription | Groq Whisper (whisper-large-v3-turbo) |
| Audio processing | ffmpeg |
| Hosting | Vercel |

## Why these choices?

- **Cloudflare R2** instead of Vercel Blob — no file size limits, free egress, files auto-delete after transcription so storage cost is $0
- **Presigned URLs** — the file goes straight from your browser to R2. Our server never touches it, so there's no upload size limit from Vercel's serverless functions
- **Trigger.dev** — transcription can take minutes for long files. Background jobs handle this without blocking or timing out
- **Groq** — fastest Whisper inference available. A 1-hour audio file transcribes in ~30 seconds

## Architecture

```
Browser ──► presigned URL ──► Cloudflare R2
                                    │
                              Trigger.dev task
                                    │
                          ┌─────────┴─────────┐
                          │  Download from R2  │
                          │  Extract audio     │
                          │  Split if >24MB    │
                          │  Groq Whisper API  │
                          │  Delete from R2    │
                          └─────────┬─────────┘
                                    │
Browser ◄── poll for status ◄───────┘
```

## Run it yourself

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- Accounts on [Trigger.dev](https://trigger.dev), [Groq](https://console.groq.com), and [Cloudflare](https://dash.cloudflare.com) (all have free tiers)

### Setup

```bash
git clone https://github.com/koopazz/audio-transcriber.git
cd audio-transcriber
npm install
```

Create a `.env.local` file:

```
GROQ_API_KEY=your-groq-api-key
TRIGGER_SECRET_KEY=your-trigger-dev-secret-key
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-r2-bucket-name
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

Set CORS on your R2 bucket:

```bash
npx wrangler r2 bucket cors set your-bucket-name --file r2-cors.json
```

### Run locally

```bash
# Terminal 1: website
npm run dev

# Terminal 2: background worker
npx trigger dev
```

### Deploy

```bash
# Website (or connect GitHub to Vercel for auto-deploy)
npx vercel --prod

# Background worker
npx trigger deploy --env prod
```

---

Built with [Claude Code](https://claude.com/claude-code)
