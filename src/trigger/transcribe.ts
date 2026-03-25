// ============================================================
// THIS IS THE "ZAP" — the background job that does the heavy lifting.
//
// When a user uploads a file, this task runs IN THE BACKGROUND.
// It doesn't block the website. The user sees "processing..."
// while this runs on Trigger.dev's cloud servers.
//
// Think of it like a Zapier Zap with 2 steps:
//   Step 1: Download the file from cloud storage
//   Step 2: Send it to Groq's Whisper API for transcription
// ============================================================

import { task } from "@trigger.dev/sdk/v3";
import Groq from "groq-sdk";

// Initialize the Groq client (uses GROQ_API_KEY env variable automatically)
const groq = new Groq();

export const transcribeAudio = task({
  // This is the unique ID for this task — like naming your Zap
  id: "transcribe-audio",

  // Retry 3 times if something fails (network issues, API hiccups, etc.)
  retry: {
    maxAttempts: 3,
  },

  run: async (payload: { fileUrl: string; fileName: string }) => {
    // --- STEP 1: Download the file from cloud storage ---
    console.log(`Downloading file: ${payload.fileName}`);
    const response = await fetch(payload.fileUrl);
    const fileBuffer = await response.arrayBuffer();
    const file = new File([fileBuffer], payload.fileName);

    // --- STEP 2: Send to Groq Whisper for transcription ---
    console.log("Sending to Groq for transcription...");
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo", // Groq's fast Whisper model
      language: "en",
    });

    console.log("Transcription complete!");
    return transcription.text;
  },
});
