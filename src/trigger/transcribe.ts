// ============================================================
// THE BACKGROUND JOB — runs on Trigger.dev's servers.
//
// Steps:
//   1. Download the file from Cloudflare R2
//   2. If it's a video, extract just the audio (much smaller)
//   3. If still too large, split into chunks
//   4. Send to Groq's Whisper API for transcription
//   5. Delete the file from R2 (no lingering storage costs)
// ============================================================

import { task } from "@trigger.dev/sdk/v3";
import Groq from "groq-sdk";
import { writeFile, readFile, unlink, stat } from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const MAX_GROQ_SIZE = 24 * 1024 * 1024; // ~24MB to be safe (Groq limit is 25MB)

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export const transcribeAudio = task({
  id: "transcribe-audio",

  machine: "large-2x",

  retry: {
    maxAttempts: 3,
  },

  run: async (payload: { r2Key: string; fileName: string }) => {
    const groq = new Groq();
    const r2 = getR2Client();
    const tmp = tmpdir();
    const inputPath = join(tmp, `input-${Date.now()}-${payload.fileName}`);
    const audioPath = join(tmp, `audio-${Date.now()}.mp3`);

    try {
      // --- STEP 1: Download from R2 (stream to disk, not RAM) ---
      console.log(`Downloading file: ${payload.fileName}`);
      const getCmd = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: payload.r2Key,
      });
      const obj = await r2.send(getCmd);
      const bodyStream = obj.Body as Readable;
      await pipeline(bodyStream, createWriteStream(inputPath));
      const inputStat = await stat(inputPath);
      console.log(`File size: ${(inputStat.size / 1024 / 1024).toFixed(1)}MB`);

      // --- STEP 2: Extract audio as compressed MP3 ---
      console.log("Extracting audio track...");
      execSync(
        `ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -ab 64k -ar 16000 -ac 1 "${audioPath}" -y 2>/dev/null`
      );

      const audioStat = await stat(audioPath);
      console.log(`Audio size: ${(audioStat.size / 1024 / 1024).toFixed(1)}MB`);

      // --- STEP 3: Transcribe (split into chunks if needed) ---
      if (audioStat.size <= MAX_GROQ_SIZE) {
        // Small enough — send directly
        const audioBuffer = await readFile(audioPath);
        const file = new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" });

        console.log("Sending to Groq for transcription...");
        const transcription = await groq.audio.transcriptions.create({
          file,
          model: "whisper-large-v3-turbo",
          language: "en",
        });

        console.log("Transcription complete!");
        return transcription.text;
      } else {
        // Too large — split into 10-minute chunks and transcribe each
        console.log("File is large, splitting into chunks...");
        const chunkPrefix = join(tmp, `chunk-${Date.now()}-`);
        execSync(
          `ffmpeg -i "${audioPath}" -f segment -segment_time 600 -c copy "${chunkPrefix}%03d.mp3" -y 2>/dev/null`
        );

        // Find all chunk files
        const chunkFiles: string[] = [];
        for (let i = 0; i < 100; i++) {
          const chunkPath = `${chunkPrefix}${String(i).padStart(3, "0")}.mp3`;
          try {
            await stat(chunkPath);
            chunkFiles.push(chunkPath);
          } catch {
            break;
          }
        }

        console.log(`Split into ${chunkFiles.length} chunks`);

        const transcripts: string[] = [];
        for (let i = 0; i < chunkFiles.length; i++) {
          console.log(`Transcribing chunk ${i + 1}/${chunkFiles.length}...`);
          const chunkBuffer = await readFile(chunkFiles[i]);
          const file = new File([chunkBuffer], `chunk-${i}.mp3`, { type: "audio/mpeg" });

          const transcription = await groq.audio.transcriptions.create({
            file,
            model: "whisper-large-v3-turbo",
            language: "en",
          });

          transcripts.push(transcription.text);
          await unlink(chunkFiles[i]).catch(() => {});
        }

        console.log("Transcription complete!");
        return transcripts.join(" ");
      }
    } finally {
      // Clean up temp files
      await unlink(inputPath).catch(() => {});
      await unlink(audioPath).catch(() => {});

      // --- STEP 5: Delete from R2 — no reason to keep it ---
      console.log("Deleting file from R2...");
      try {
        await r2.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: payload.r2Key,
        }));
        console.log("File deleted from R2.");
      } catch (e) {
        console.error("Failed to delete from R2 (non-fatal):", e);
      }
    }
  },
});
