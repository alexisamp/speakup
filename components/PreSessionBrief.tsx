"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserKey } from "@/lib/userKey";

interface Props {
  topic: string;
  topicContext: string;
  onStart: (sessionContext: string) => void;
  onBack: () => void;
  fromExtension?: boolean;
  initialContext?: string;
}

export default function PreSessionBrief({ topic, topicContext, onStart, onBack, fromExtension, initialContext }: Props) {
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [topVocab, setTopVocab] = useState<{
    original: string;
    better: string;
    times_seen: number;
  } | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [contextInput, setContextInput] = useState(initialContext ?? "");
  const [urlTitle, setUrlTitle] = useState<string | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userKey = getUserKey();
    if (!userKey) {
      setLoading(false);
      return;
    }

    Promise.all([
      supabase
        .from("sessions")
        .select("focus_next_session")
        .eq("user_key", userKey)
        .not("focus_next_session", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          setFocusNote(data?.[0]?.focus_next_session ?? null);
        }),

      supabase
        .from("vocabulary")
        .select("original_phrase, better_phrase, times_seen")
        .eq("user_key", userKey)
        .order("times_seen", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data?.[0]) {
            setTopVocab({
              original: data[0].original_phrase,
              better: data[0].better_phrase,
              times_seen: data[0].times_seen,
            });
          }
        }),

      supabase
        .from("sessions")
        .select("session_date, duration_minutes")
        .eq("user_key", userKey)
        .gte(
          "session_date",
          (() => {
            const d = new Date();
            d.setDate(d.getDate() - 60);
            return d.toISOString().split("T")[0];
          })()
        )
        .order("session_date", { ascending: false })
        .then(({ data }) => {
          if (!data) return;
          const qualified = new Set(
            data
              .filter((r) => (r.duration_minutes ?? 0) >= 10)
              .map((r) => r.session_date)
          );
          let s = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const d = new Date(today);
          const todayKey = d.toISOString().split("T")[0];
          if (!qualified.has(todayKey)) d.setDate(d.getDate() - 1);
          while (true) {
            const key = d.toISOString().split("T")[0];
            if (qualified.has(key)) {
              s++;
              d.setDate(d.getDate() - 1);
            } else break;
          }
          setStreak(s);
        }),
    ]).finally(() => setLoading(false));
  }, []);

  // URL detection with debounce
  useEffect(() => {
    const trimmed = contextInput.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      setFetchingUrl(true);
      setUrlTitle(null);
      const timeout = setTimeout(async () => {
        try {
          const res = await fetch("/api/fetch-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: trimmed }),
          });
          const data = await res.json();
          setUrlTitle(data.title ?? null);
        } catch {
          setUrlTitle(null);
        } finally {
          setFetchingUrl(false);
        }
      }, 800);
      return () => clearTimeout(timeout);
    } else {
      setUrlTitle(null);
      setFetchingUrl(false);
    }
  }, [contextInput]);

  function handleStart() {
    const parts = [topicContext];
    if (contextInput.trim()) {
      if (urlTitle) {
        parts.push(`Additional context — article: "${urlTitle}". URL: ${contextInput.trim()}`);
      } else {
        parts.push(`Additional context: ${contextInput.trim()}`);
      }
    }
    onStart(parts.join("\n\n"));
  }

  const hasHistory = focusNote || topVocab || streak > 0;

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h3 className="text-white font-semibold text-lg">{topic}</h3>
          <p className="text-gray-500 text-sm">Pre-session brief</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-600 text-sm">
          Loading…
        </div>
      ) : hasHistory ? (
        <div className="space-y-3">
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-orange-950/40 border border-orange-800/40 rounded-xl p-3">
              <span className="text-xl">🔥</span>
              <span className="text-orange-300 text-sm font-medium">
                {streak} day streak — keep it going!
              </span>
            </div>
          )}
          {focusNote && (
            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3">
              <p className="text-xs text-indigo-400 font-medium mb-1">Today's focus</p>
              <p className="text-gray-200 text-sm">{focusNote}</p>
            </div>
          )}
          {topVocab && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">
                Most repeated error ×{topVocab.times_seen}
              </p>
              <p className="text-sm">
                <span className="text-gray-400 line-through">{topVocab.original}</span>
                <span className="text-gray-600 mx-2">→</span>
                <span className="text-green-400 font-medium">{topVocab.better}</span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-gray-300 text-sm font-medium">First session! Just speak freely.</p>
          <p className="text-gray-600 text-xs mt-1">No pressure — relax and have a natural conversation.</p>
        </div>
      )}

      {/* Extension context banner */}
      {fromExtension && (
        <div className="flex items-center gap-2 bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3">
          <span className="text-base">📖</span>
          <span className="text-indigo-300 text-sm">Context loaded from Chrome extension</span>
        </div>
      )}

      {/* Context input */}
      <div>
        <label className="text-gray-400 text-xs font-medium block mb-2">
          Add context (optional) — paste a URL or describe what you want to talk about
        </label>
        <textarea
          value={contextInput}
          onChange={(e) => setContextInput(e.target.value)}
          rows={3}
          placeholder="e.g. https://... or 'I watched Oppenheimer last night'"
          className="w-full bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl p-3 text-gray-200 text-sm resize-none focus:outline-none transition-colors placeholder-gray-600"
        />
        {fetchingUrl && (
          <p className="text-gray-500 text-xs mt-1">Fetching URL…</p>
        )}
        {urlTitle && !fetchingUrl && (
          <p className="text-indigo-400 text-xs mt-1 truncate">✓ {urlTitle}</p>
        )}
      </div>

      <button
        onClick={handleStart}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/30"
      >
        Start session
      </button>
    </div>
  );
}
