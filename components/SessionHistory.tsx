"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserKey } from "@/lib/userKey";
import { PARTNERS } from "@/lib/partners";
import { LineChart, Line } from "recharts";

interface PhraseItem {
  original: string;
  better: string;
  category: string;
}

interface Session {
  id: string;
  session_date: string;
  score: number | null;
  duration_minutes: number;
  raw_feedback: string | null;
  pronunciation_notes: string | null;
  fluency_notes: string | null;
  phrases_to_practice: PhraseItem[] | null;
  focus_next_session: string | null;
  partner_disc: string | null;
  partner_name: string | null;
  created_at: string;
}

function scoreChipColor(score: number | null) {
  if (score === null) return "bg-gray-800 text-gray-500 border-gray-700";
  if (score <= 4) return "bg-red-900/50 text-red-300 border-red-800/50";
  if (score <= 6) return "bg-yellow-900/50 text-yellow-300 border-yellow-800/50";
  if (score <= 8) return "bg-green-900/50 text-green-300 border-green-800/50";
  return "bg-emerald-900/50 text-emerald-300 border-emerald-800/50";
}

function getPartnerEmoji(disc: string | null): string {
  if (!disc) return "";
  return PARTNERS.find((p) => p.disc === disc)?.emoji ?? "";
}

export default function SessionHistory({ refreshKey }: { refreshKey: number }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [topVocab, setTopVocab] = useState<{
    original: string;
    better: string;
    times_seen: number;
  } | null>(null);

  useEffect(() => {
    const userKey = getUserKey();
    if (!userKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      supabase
        .from("sessions")
        .select(
          "id, session_date, score, duration_minutes, raw_feedback, pronunciation_notes, fluency_notes, phrases_to_practice, focus_next_session, partner_disc, partner_name, created_at"
        )
        .eq("user_key", userKey)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) console.error("Sessions load failed:", error);
          setSessions(data ?? []);
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
    ]).finally(() => setLoading(false));
  }, [refreshKey]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600 text-sm">
        Loading history…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p className="text-lg mb-2">No sessions yet</p>
        <p className="text-sm">Your practice sessions will appear here.</p>
      </div>
    );
  }

  const sparkData = sessions
    .slice(0, 14)
    .reverse()
    .map((s, i) => ({ i, score: s.score ?? 0 }));

  return (
    <div className="w-full space-y-4">
      {/* Progress summary */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Progress
            </p>
            <p className="text-white text-sm">
              <span className="font-semibold text-lg">{sessions.length}</span>{" "}
              <span className="text-gray-500">sessions total</span>
            </p>
            {topVocab && (
              <p className="text-sm truncate">
                <span className="text-gray-500 text-xs">Top error </span>
                <span className="text-gray-400 text-xs line-through">
                  {topVocab.original}
                </span>
                <span className="text-gray-600 text-xs mx-1">→</span>
                <span className="text-green-400 text-xs">{topVocab.better}</span>
                <span className="text-gray-600 text-xs ml-1">×{topVocab.times_seen}</span>
              </p>
            )}
          </div>
          {sparkData.length > 1 && (
            <div className="shrink-0">
              <p className="text-gray-600 text-xs mb-1 text-right">
                Last {sparkData.length}
              </p>
              <LineChart width={60} height={30} data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </div>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="space-y-2">
        {sessions.map((session) => {
          const isOpen = expanded.has(session.id);
          const date = new Date(session.session_date + "T00:00:00");
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const partnerEmoji = getPartnerEmoji(session.partner_disc);
          const partnerLabel = session.partner_name
            ? `${partnerEmoji} ${session.partner_name}`
            : null;
          const preview = session.raw_feedback
            ? session.raw_feedback
                .split("\n")
                .filter(Boolean)
                .slice(0, 2)
                .join(" ")
                .slice(0, 120)
            : null;

          return (
            <div
              key={session.id}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(session.id)}
                className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-800/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {partnerLabel && (
                      <span className="text-gray-400 text-xs font-medium">{partnerLabel}</span>
                    )}
                    {partnerLabel && <span className="text-gray-700">·</span>}
                    <span className="text-gray-300 text-sm font-medium">{dateStr}</span>
                    <span className="text-xs bg-gray-700/60 text-gray-400 px-2 py-0.5 rounded-full border border-gray-600/50">
                      {session.duration_minutes} min
                    </span>
                    {session.score !== null && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${scoreChipColor(session.score)}`}
                      >
                        {session.score}/10
                      </span>
                    )}
                  </div>
                  {preview && (
                    <p className="text-gray-600 text-xs mt-1 truncate">{preview}</p>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-600 shrink-0 mt-0.5 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50 pt-3">
                  {session.pronunciation_notes && (
                    <div>
                      <p className="text-xs text-blue-400 font-medium mb-1">Pronunciation</p>
                      <p className="text-gray-300 text-sm">{session.pronunciation_notes}</p>
                    </div>
                  )}
                  {session.fluency_notes && (
                    <div>
                      <p className="text-xs text-green-400 font-medium mb-1">Fluency</p>
                      <p className="text-gray-300 text-sm">{session.fluency_notes}</p>
                    </div>
                  )}
                  {session.phrases_to_practice && session.phrases_to_practice.length > 0 && (
                    <div>
                      <p className="text-xs text-purple-400 font-medium mb-2">
                        Phrases to practice
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {session.phrases_to_practice.map((p, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1"
                          >
                            <span className="text-gray-400 line-through">{p.original}</span>
                            <span className="text-gray-600 mx-1.5">→</span>
                            <span className="text-green-400">{p.better}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {session.focus_next_session && (
                    <div>
                      <p className="text-xs text-indigo-400 font-medium mb-1">
                        Focus next session
                      </p>
                      <p className="text-gray-300 text-sm">{session.focus_next_session}</p>
                    </div>
                  )}
                  {!session.pronunciation_notes &&
                    !session.fluency_notes &&
                    !session.phrases_to_practice?.length &&
                    !session.focus_next_session &&
                    session.raw_feedback && (
                      <p className="text-gray-400 text-sm whitespace-pre-wrap">
                        {session.raw_feedback}
                      </p>
                    )}
                  {!session.pronunciation_notes &&
                    !session.fluency_notes &&
                    !session.phrases_to_practice?.length &&
                    !session.focus_next_session &&
                    !session.raw_feedback && (
                      <p className="text-gray-600 text-sm">No detailed feedback available.</p>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
