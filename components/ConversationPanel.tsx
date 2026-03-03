"use client";

import { useConversation } from "@elevenlabs/react";
import { useRef, useState, useEffect, useCallback } from "react";

interface PhraseItem {
  original: string;
  better: string;
  category: string;
}

export interface SessionEndData {
  score: number | undefined;
  notes: string;
  duration: number;
  conversationId?: string;
  transcript?: string;
  rawFeedback?: string;
  pronunciationNotes?: string;
  fluencyNotes?: string;
  phrasesToPractice?: PhraseItem[];
  focusNextSession?: string;
}

interface Props {
  topic: string;
  context: string;
  onSessionEnd: (data: SessionEndData) => void;
}

type EndPhase = "idle" | "waiting" | "fetching";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseFeedback(text: string): Omit<SessionEndData, "duration" | "conversationId" | "transcript" | "notes"> {
  const scoreMatch = text.match(/[Ss]core[:\s]+(\d+)/);
  const score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : undefined;

  const pronMatch = text.match(/[Pp]ronunciation[:\s]+([\s\S]*?)(?=\n[A-Z]|Fluency|Phrases|Focus|$)/);
  const pronunciationNotes = pronMatch?.[1]?.trim().replace(/\n+/g, " ") || undefined;

  const fluencyMatch = text.match(/[Ff]luency[:\s]+([\s\S]*?)(?=\n[A-Z]|Pronunciation|Phrases|Focus|$)/);
  const fluencyNotes = fluencyMatch?.[1]?.trim().replace(/\n+/g, " ") || undefined;

  const phrasesSection = text.match(/[Pp]hrases[^:\n]*:([\s\S]*?)(?=Focus|$)/);
  const phrasesToPractice: PhraseItem[] = [];
  if (phrasesSection) {
    const lines = phrasesSection[1].split("\n");
    for (const line of lines) {
      const m = line.match(/["']?([^"'→\-\n]+?)["']?\s*[→\-]+\s*["']?([^"'\n]+)["']?/);
      if (m && m[1].trim() && m[2].trim()) {
        phrasesToPractice.push({
          original: m[1].trim(),
          better: m[2].trim(),
          category: "general",
        });
      }
    }
  }

  const focusMatch = text.match(/[Ff]ocus[^:\n]*next[^:\n]*:[:\s]*([\s\S]*?)(?=\n\n|$)/);
  const focusNextSession = focusMatch?.[1]?.trim().replace(/\n+/g, " ") || undefined;

  return { score, pronunciationNotes, fluencyNotes, phrasesToPractice, focusNextSession };
}

async function fetchConversationData(convId: string): Promise<{
  transcript: string;
  rawFeedback: string;
  durationSecs: number;
} | null> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${convId}`,
      {
        headers: {
          "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const transcriptArr: { role: string; message: string }[] = data.transcript ?? [];
    const transcript = transcriptArr
      .map((t) => `${t.role === "agent" ? "Alex" : "You"}: ${t.message}`)
      .join("\n");

    // Find last agent message containing "SESSION FEEDBACK" or "Score"
    const feedbackMsg = [...transcriptArr]
      .reverse()
      .find(
        (t) =>
          t.role === "agent" &&
          (t.message.includes("SESSION FEEDBACK") || /[Ss]core[:\s]+\d+/.test(t.message))
      );
    const rawFeedback = feedbackMsg?.message ?? transcriptArr[transcriptArr.length - 1]?.message ?? "";

    const durationSecs = data.metadata?.call_duration_secs ?? 0;
    return { transcript, rawFeedback, durationSecs };
  } catch {
    return null;
  }
}

export default function ConversationPanel({ topic, context, onSessionEnd }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [endPhase, setEndPhase] = useState<EndPhase>("idle");
  const [micState, setMicState] = useState<"unknown" | "granted" | "denied">("unknown");
  const [elapsed, setElapsed] = useState(0);

  const convIdRef = useRef<string | undefined>();
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversation = useConversation({
    onError: useCallback((msg: string) => {
      console.error("ElevenLabs error:", msg);
    }, []),
  });

  useEffect(() => {
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        setMicState(result.state as "granted" | "denied" | "unknown");
        result.addEventListener("change", () => {
          setMicState(result.state as "granted" | "denied" | "unknown");
        });
      })
      .catch(() => setMicState("unknown"));
  }, []);

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  async function handleStart() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicState("granted");
      setElapsed(0);

      const dynamicVars: Record<string, string> = {};
      if (topic) dynamicVars.topic = topic;
      if (context) dynamicVars.context = context;

      const convId = await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
        connectionType: "webrtc",
        ...(Object.keys(dynamicVars).length > 0 && { dynamicVariables: dynamicVars }),
      });
      convIdRef.current = convId;
      setIsActive(true);
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setMicState("denied");
      }
      console.error("Start failed:", err);
    }
  }

  async function handleEnd() {
    const capturedElapsed = elapsed;
    setEndPhase("waiting");

    // Let agent deliver feedback
    conversation.sendUserMessage("end session");
    await new Promise((r) => setTimeout(r, 10_000));

    // End the WebRTC connection
    setEndPhase("fetching");
    await conversation.endSession();
    setIsActive(false);

    // Wait for ElevenLabs to finalize transcript
    await new Promise((r) => setTimeout(r, 3_000));

    // Fetch full conversation data from API
    const convId = convIdRef.current;
    let sessionData: SessionEndData;

    if (convId) {
      const apiData = await fetchConversationData(convId);
      if (apiData) {
        const durationMin = apiData.durationSecs > 0
          ? Math.max(1, Math.round(apiData.durationSecs / 60))
          : Math.max(1, Math.round(capturedElapsed / 60));
        const parsed = parseFeedback(apiData.rawFeedback);
        sessionData = {
          ...parsed,
          notes: apiData.rawFeedback,
          duration: durationMin,
          conversationId: convId,
          transcript: apiData.transcript,
          rawFeedback: apiData.rawFeedback,
        };
      } else {
        sessionData = {
          score: undefined,
          notes: "",
          duration: Math.max(1, Math.round(capturedElapsed / 60)),
          conversationId: convId,
        };
      }
    } else {
      sessionData = {
        score: undefined,
        notes: "",
        duration: Math.max(1, Math.round(capturedElapsed / 60)),
      };
    }

    setEndPhase("idle");
    onSessionEnd(sessionData);
  }

  const statusLabel =
    endPhase === "waiting"
      ? "Waiting for feedback…"
      : endPhase === "fetching"
      ? "Getting your feedback…"
      : conversation.isSpeaking
      ? "Alex is speaking…"
      : "Listening…";

  const isEnding = endPhase !== "idle";

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {micState === "denied" && (
        <div className="w-full bg-red-950 border border-red-800 rounded-xl p-3 text-red-400 text-sm text-center">
          Microphone access denied — enable it in browser settings.
        </div>
      )}
      {micState === "unknown" && !isActive && (
        <div className="w-full bg-yellow-950 border border-yellow-800 rounded-xl p-3 text-yellow-400 text-sm text-center">
          Microphone permission required to start.
        </div>
      )}

      {isActive && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isEnding
                  ? "bg-yellow-400 animate-pulse"
                  : conversation.isSpeaking
                  ? "bg-blue-400 animate-pulse"
                  : "bg-green-400 animate-pulse"
              }`}
            />
            <span className="text-sm text-gray-300">{statusLabel}</span>
          </div>
          <span className="text-4xl font-mono font-bold tabular-nums text-white">
            {formatTime(elapsed)}
          </span>
          {elapsed < 600 && !isEnding && (
            <span className="text-xs text-gray-600">
              {Math.ceil((600 - elapsed) / 60)} min left to qualify for streak
            </span>
          )}
        </div>
      )}

      {!isActive ? (
        <button
          onClick={handleStart}
          disabled={micState === "denied"}
          className="w-36 h-36 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
        >
          <svg className="w-12 h-12 text-white mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.3 6-6.72h-1.7z" />
          </svg>
          <span className="text-white text-sm font-medium">Start</span>
        </button>
      ) : (
        <button
          onClick={handleEnd}
          disabled={isEnding}
          className="w-28 h-28 rounded-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-red-500/40 hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
        >
          {isEnding ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
              <span className="text-white text-xs text-center px-2 leading-tight">
                {endPhase === "fetching" ? "Fetching…" : "Wait…"}
              </span>
            </>
          ) : (
            <>
              <svg className="w-9 h-9 text-white mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              <span className="text-white text-sm font-medium">End</span>
            </>
          )}
        </button>
      )}

      {!isActive && (
        <p className="text-gray-600 text-sm text-center max-w-xs">
          {topic ? `Topic: ${topic.split("—")[0].trim()}` : "Choose a topic to start"}
        </p>
      )}
    </div>
  );
}
