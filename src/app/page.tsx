"use client";

import { useState, useCallback } from "react";
import { upload } from "@vercel/blob/client";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus("uploading");
    setTranscript("");
    setError("");

    try {
      // Step 1: Upload directly from browser to Vercel Blob (no server size limit)
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      // Step 2: Tell Trigger.dev to process it
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: blob.url, fileName: file.name }),
      });

      if (!res.ok) throw new Error(await res.text());

      const { runId } = await res.json();
      setStatus("processing");

      // Step 3: Poll for the result
      while (true) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(`/api/transcribe/status?runId=${runId}`);
        const data = await poll.json();

        if (data.status === "COMPLETED") {
          setTranscript(data.output);
          setStatus("done");
          break;
        } else if (data.status === "FAILED" || data.status === "CANCELED") {
          throw new Error(data.error || "Transcription failed");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Audio Transcriber</h1>
        <p className="text-zinc-400">
          Drop an audio or video file. Trigger.dev sends it to Groq for transcription in the background.
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`w-full border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
          dragOver ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 hover:border-zinc-500"
        }`}
      >
        <input type="file" accept="audio/*,video/*" onChange={onFileSelect} className="hidden" />
        <p className="text-lg">
          {status === "idle" ? "Drag & drop your file here, or click to browse" : `Selected: ${fileName}`}
        </p>
      </label>

      {status === "uploading" && (
        <div className="flex items-center gap-3 text-blue-400"><Spinner /> Uploading file...</div>
      )}
      {status === "processing" && (
        <div className="flex items-center gap-3 text-yellow-400"><Spinner /> Transcribing with Groq...</div>
      )}
      {status === "error" && (
        <div className="text-red-400 bg-red-400/10 rounded-lg p-4 w-full">Error: {error}</div>
      )}

      {status === "done" && (
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-2">Transcript</h2>
          <div className="bg-zinc-900 rounded-lg p-6 whitespace-pre-wrap text-sm leading-relaxed border border-zinc-800">
            {transcript}
          </div>
        </div>
      )}
    </main>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
