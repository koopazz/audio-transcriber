// ============================================================
// API ROUTE: GET /api/transcribe/status?runId=xxx
//
// The frontend polls this every 2 seconds to check:
// "Is my transcription done yet?"
//
// In Zapier terms: this is like checking the Zap history
// to see if your run completed.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({ error: "Missing runId" }, { status: 400 });
  }

  try {
    // Ask Trigger.dev: "What's the status of this run?"
    const run = await runs.retrieve(runId);

    return NextResponse.json({
      status: run.status,       // COMPLETED, FAILED, EXECUTING, etc.
      output: run.output,       // The transcript text (when done)
      error: run.status === "FAILED" ? "Transcription failed" : undefined,
    });
  } catch (err: unknown) {
    console.error("Status check error:", err);
    return NextResponse.json(
      { error: "Could not check status" },
      { status: 500 }
    );
  }
}
