// This endpoint handles the Vercel Blob client upload protocol.
// The browser uploads DIRECTLY to Vercel Blob (no size limit).
// This endpoint only generates the upload token and receives the completion callback.

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["audio/*", "video/*"],
        maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        addRandomSuffix: true,
      }),
      // This gets called after upload completes — we don't need to do anything here
      onUploadCompleted: async ({ blob }) => {
        console.log("Upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
