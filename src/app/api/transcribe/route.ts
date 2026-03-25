// ============================================================
// API ROUTE: POST /api/transcribe
//
// This is what happens when the user drops a file:
// 1. Upload file to Vercel Blob (cloud storage)
// 2. Tell Trigger.dev to start the transcription task
// 3. Return the run ID so the frontend can poll for results
//
// In Zapier terms: this is the "trigger" that starts the Zap.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import type { transcribeAudio } from "@/trigger/transcribe";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json("No file provided", { status: 400 });
    }

    // Upload file to cloud storage (Vercel Blob)
    // This gives us a URL that the Trigger.dev worker can download from
    const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    // Trigger the background task!
    const handle = await tasks.trigger<typeof transcribeAudio>(
      "transcribe-audio",
      {
        fileUrl: blob.url,
        fileName: file.name,
      }
    );

    // Return the run ID so the frontend can check on progress
    return NextResponse.json({ runId: handle.id });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      err instanceof Error ? err.message : "Upload failed",
      { status: 500 }
    );
  }
}
