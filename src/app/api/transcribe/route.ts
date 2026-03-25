// Receives the R2 key and triggers the background job.

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { transcribeAudio } from "@/trigger/transcribe";

export async function POST(req: NextRequest) {
  try {
    const { r2Key, fileName } = await req.json();

    if (!r2Key) {
      return NextResponse.json("No R2 key provided", { status: 400 });
    }

    const handle = await tasks.trigger<typeof transcribeAudio>(
      "transcribe-audio",
      { r2Key, fileName }
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
