// Receives the Blob URL (not the file itself) and triggers the background job.

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { transcribeAudio } from "@/trigger/transcribe";

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, fileName } = await req.json();

    if (!fileUrl) {
      return NextResponse.json("No file URL provided", { status: 400 });
    }

    const handle = await tasks.trigger<typeof transcribeAudio>(
      "transcribe-audio",
      { fileUrl, fileName }
    );

    return NextResponse.json({ runId: handle.id });
  } catch (err: unknown) {
    console.error("Trigger error:", err);
    return NextResponse.json(
      err instanceof Error ? err.message : "Failed to start transcription",
      { status: 500 }
    );
  }
}
