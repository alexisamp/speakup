"use client";

import { useState, useEffect, useRef } from "react";

interface PronunciationItem {
  original: string;
  better: string;
}

interface Props {
  pronunciationNotes: string;
  voiceId: string;
}

function parseItems(notes: string): PronunciationItem[] {
  const items: PronunciationItem[] = [];

  // Split by newlines or sentence endings and try to find original→better pairs
  const segments = notes
    .split(/[\n]|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  for (const seg of segments) {
    if (items.length >= 3) break;

    // Pattern: "X" → "Y" or X → Y
    const arrowMatch = seg.match(/["']?([^"'→\n]{2,40})["']?\s*→\s*["']?([^"'\n]{2,60})["']?/);
    if (arrowMatch) {
      items.push({
        original: arrowMatch[1].trim().replace(/^["']|["']$/g, ""),
        better: arrowMatch[2].trim().replace(/^["']|["']$/g, ""),
      });
      continue;
    }

    // Pattern: "X should be Y" or "say Y instead of X"
    const shouldMatch = seg.match(/["']?([^"']+?)["']?\s+should be\s+["']?([^"'.]+?)["']?/i);
    if (shouldMatch) {
      items.push({
        original: shouldMatch[1].trim().replace(/^["']|["']$/g, ""),
        better: shouldMatch[2].trim().replace(/^["']|["']$/g, ""),
      });
      continue;
    }

    // Pattern: 'practice "X"' or mentions a specific word with quotes
    const quoteMatch = seg.match(/["']([^"']{2,40})["']/g);
    if (quoteMatch && quoteMatch.length >= 2) {
      items.push({
        original: quoteMatch[0].replace(/^["']|["']$/g, ""),
        better: quoteMatch[1].replace(/^["']|["']$/g, ""),
      });
    }
  }

  // Fallback: just show first 3 segments without original/better split
  if (items.length === 0) {
    return segments.slice(0, 3).map((s) => ({ original: "", better: s }));
  }

  return items;
}

async function synthesizeAndPlay(text: string, voiceId: string): Promise<void> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}

export default function PronunciationReplay({ pronunciationNotes, voiceId }: Props) {
  const [items] = useState<PronunciationItem[]>(() => parseItems(pronunciationNotes));
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  if (items.length === 0) return null;

  async function handleHearIt(idx: number, text: string) {
    if (playingIdx !== null) return;
    setPlayingIdx(idx);
    try {
      await synthesizeAndPlay(text, voiceId);
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setPlayingIdx(null);
    }
  }

  async function handleRecord(idx: number) {
    if (recordingIdx !== null || playingIdx !== null) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return; // mic denied
    }

    setRecordingIdx(idx);
    setCountdown(4);

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      recorder.stop();
      setRecordingIdx(null);
      setCountdown(0);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }, 4000);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Pronunciation Replay
      </p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="bg-gray-900 border border-gray-700/60 rounded-xl p-3 flex items-center gap-3 flex-wrap"
          >
            {/* Phrase display */}
            <div className="flex-1 min-w-0 flex items-center gap-2 text-sm flex-wrap">
              {item.original ? (
                <>
                  <span className="text-gray-500 line-through truncate">{item.original}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-green-400 font-medium truncate">{item.better}</span>
                </>
              ) : (
                <span className="text-gray-300">{item.better}</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Hear it */}
              <button
                onClick={() => handleHearIt(idx, item.better || item.original)}
                disabled={playingIdx !== null || recordingIdx !== null}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  playingIdx === idx
                    ? "bg-blue-900/60 text-blue-300 border border-blue-700"
                    : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {playingIdx === idx ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                    Playing
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Hear it
                  </>
                )}
              </button>

              {/* Record */}
              <button
                onClick={() => handleRecord(idx)}
                disabled={playingIdx !== null || recordingIdx !== null}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  recordingIdx === idx
                    ? "bg-red-900/60 text-red-300 border border-red-700"
                    : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {recordingIdx === idx ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                    {countdown}s
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Record
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
