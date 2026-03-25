# Progress

## COMPLETED
1. ✅ Created Next.js app from scratch (no create-next-app — built manually)
2. ✅ Built drag-and-drop UI for file uploads (src/app/page.tsx)
3. ✅ Created Trigger.dev background task for transcription (src/trigger/transcribe.ts)
4. ✅ Task extracts audio from video using ffmpeg before sending to Groq (handles large files)
5. ✅ Task splits audio into chunks if over 24MB (Groq's limit)
6. ✅ Created API routes for triggering tasks and polling status
7. ✅ Set up trigger.config.ts with ffmpeg build extension
8. ✅ Deployed website to Vercel (https://trigger-dev-tau.vercel.app)
9. ✅ Deployed Trigger.dev worker to production (with ffmpeg)
10. ✅ Set all env vars in Vercel and Trigger.dev (GROQ_API_KEY, TRIGGER_SECRET_KEY, BLOB_READ_WRITE_TOKEN)
11. ✅ App works locally — tested successfully with local file upload + Trigger.dev dev worker
12. ✅ Switched from dev to production Trigger.dev environment

## CURRENT BLOCKER — FILE UPLOAD ON PRODUCTION
The Vercel Blob client upload is failing with CORS errors:
```
Access to fetch at 'https://vercel.com/api/blob/?pathname=...' from origin 'https://trigger-dev-tau.vercel.app' has been blocked by CORS policy
PUT https://vercel.com/api/blob/?pathname=... net::ERR_FAILED 413 (Content Too Large)
```

### Root Cause
The `@vercel/blob/client` `upload()` function is hitting `vercel.com/api/blob/` instead of the project's blob store URL (should be something like `gzge3w9o0xu1mami.public.blob.vercel-storage.com`). This suggests:
- The `BLOB_READ_WRITE_TOKEN` might not be correctly associated with the blob store
- OR the client upload token generation in `/api/upload` is returning incorrect upload URLs
- The blob store IS connected to the project for production+preview environments
- The `handleUpload` in `/api/upload/route.ts` uses the standard Vercel Blob client upload protocol

### What Needs to Happen
1. Debug why `@vercel/blob/client` `upload()` is targeting `vercel.com/api/blob/` instead of the correct blob store URL
2. Might need to check if the `BLOB_READ_WRITE_TOKEN` env var value actually corresponds to the `store_GZgE3w9o0XU1maMi` store
3. Alternative approach: use a different upload method that bypasses Vercel's 4.5MB serverless function body limit
4. Could consider: presigned URLs, or a different storage provider (S3, Cloudflare R2)

### Things Already Tried
- Server-side upload with `put()` — hit 4.5MB Vercel body limit (413)
- Client-side upload with `@vercel/blob/client` `upload()` — CORS errors, uploads going to wrong URL
- `handleUpload` with `addRandomSuffix: true` — didn't fix
- Streaming upload — still hits body limit
- `next.config.ts` `bodySizeLimit: "500mb"` — doesn't affect serverless function limits

### Blob Store Info
- 3 blob stores were accidentally created (transcriber-uploads, transcriber-files, transcriber)
- `store_GZgE3w9o0XU1maMi` ("transcriber") is the one connected to the project
- Connected for production + preview environments (NOT development)
