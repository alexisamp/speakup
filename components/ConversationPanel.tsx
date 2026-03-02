"use client";

import { useConversation } from "@elevenlabs/react";
import { useRef, useState, useEffect, useCallback } from "react";

interface Message {
  message: string;
  source: "ai" | "user";
}

export interface SessionEndData {
  score: number | undefined;
  notes: string;
  duration: number;
}

interface Props {
  onSessionEnd: (data: SessionEndData) => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function extractScoreAndNotes(messages: Message[]) {
  const feedbackMsg = [...messages]
    .reverse()
    .find((m) => m.source === "ai" && /score/i.test(m.message));

  if (feedbackMsg) {
    const match = feedbackMsg.message.match(/score[:\s]+(\d+)/i);
    const score = match
      ? Math.min(10, Math.max(1, parseInt(match[1])))
      : undefined;
    return { score, notes: feedbackMsg.message };
  }

  const lastAi = [...messages].reverse().find((m) => m.source === "ai");
  return { score: undefined, notes: lastAi?.message ?? "" };
}

export default function ConversationPanel({ onSessionEnd }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [micState, setMicState] = useState<"unknown" | "granted" | "denied">(
    "unknown"
  );
  const [elapsed, setElapsed] = useState(0);

  const messagesRef = useRef<Message[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversation = useConversation({
    onMessage: useCallback(
      ({ message, source }: { message: string; source: "ai" | "user" }) => {
        messagesRef.current.push({ message, source });
      },
      []
    ),
    onError: useCallback((msg: string) => {
      console.error("ElevenLabs error:", msg);
    }, []),
  });

  // Check mic permission on mount
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

  // Timer — reset and start when session becomes active
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
      messagesRef.current = [];
      setElapsed(0);
      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
        connectionType: "webrtc",
      });
      setIsActive(true);
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setMicState("denied");
      }
      console.error("Start failed:", err);
    }
  }

  async function handleEnd() {
    setIsEnding(true);
    try {
      conversation.sendUserMessage("end session");
      // Wait 10 s for the agent to deliver feedback
      await new Promise((r) => setTimeout(r, 10_000));
    } finally {
      await conversation.endSession();
      setIsActive(false);
      setIsEnding(false);

      const duration = Math.max(1, Math.round(elapsed / 60));
      const { score, notes } = extractScoreAndNotes(messagesRef.current);
      onSessionEnd({ score, notes, duration });
    }
  }

  const statusLabel = isEnding
    ? "Getting feedback…"
    : conversation.isSpeaking
    ? "Alex is speaking…"
    : "Listening…";

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Mic permission banner */}
      {micState === "denied" && (
        <div className="w-full bg-red-950 border border-red-800 rounded-xl p-3 text-red-400 text-sm text-center">
          Microphone access denied — enable it in browser settings to continue.
        </div>
      )}
      {micState === "unknown" && !isActive && (
        <div className="w-full bg-yellow-950 border border-yellow-800 rounded-xl p-3 text-yellow-400 text-sm text-center">
          Microphone permission is required to start a conversation.
        </div>
      )}

      {/* Live status */}
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
        </div>
      )}

      {/* Primary button */}
      {!isActive ? (
        <button
          onClick={handleStart}
          disabled={micState === "denied"}
          className="group relative w-36 h-36 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
        >
          <svg
            className="w-12 h-12 text-white mb-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
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
              <span className="text-white text-xs">Wait…</span>
            </>
          ) : (
            <>
              <svg
                className="w-9 h-9 text-white mb-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 6h12v12H6z" />
              </svg>
              <span className="text-white text-sm font-medium">End</span>
            </>
          )}
        </button>
      )}

      {!isActive && (
        <p className="text-gray-600 text-sm text-center max-w-xs">
          Press Start to begin your speaking session with Alex, your AI coach.
        </p>
      )}
    </div>
  );
}
