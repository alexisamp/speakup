"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserKey } from "@/lib/userKey";
import type { SessionEndData } from "./ConversationPanel";

interface Props extends SessionEndData {
  onSaved: () => void;
  onDiscard: () => void;
}

export default function SaveSessionPanel({
  score: initialScore,
  notes: initialNotes,
  duration,
  conversationId,
  transcript,
  rawFeedback,
  pronunciationNotes,
  fluencyNotes,
  phrasesToPractice,
  focusNextSession,
  onSaved,
  onDiscard,
}: Props) {
  const [score, setScore] = useState<number>(initialScore ?? 5);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const userKey = getUserKey();
    if (!userKey) return;

    setSaving(true);
    setError(null);

    const today = new Date().toISOString().split("T")[0];

    const { error: err } = await supabase.from("sessions").insert({
      user_key: userKey,
      session_date: today,
      score,
      notes: notes.trim() || null,
      duration_minutes: duration,
      elevenlabs_conversation_id: conversationId ?? null,
      transcript: transcript ?? null,
      raw_feedback: rawFeedback ?? null,
      pronunciation_notes: pronunciationNotes ?? null,
      fluency_notes: fluencyNotes ?? null,
      phrases_to_practice: phrasesToPractice?.length ? phrasesToPractice : null,
      focus_next_session: focusNextSession ?? null,
    });

    if (err) {
      setSaving(false);
      setError(err.message);
      return;
    }

    // Upsert vocabulary phrases
    if (phrasesToPractice?.length) {
      for (const phrase of phrasesToPractice) {
        const { data: existing } = await supabase
          .from("vocabulary")
          .select("id, times_seen")
          .eq("user_key", userKey)
          .eq("original_phrase", phrase.original)
          .single();

        if (existing) {
          await supabase
            .from("vocabulary")
            .update({ times_seen: existing.times_seen + 1 })
            .eq("id", existing.id);
        } else {
          await supabase.from("vocabulary").insert({
            user_key: userKey,
            original_phrase: phrase.original,
            better_phrase: phrase.better,
            category: phrase.category ?? "general",
            session_date: today,
          });
        }
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Session complete</h3>
        <span className="text-gray-500 text-sm">{duration} min</span>
      </div>

      {/* Structured feedback */}
      {(pronunciationNotes || fluencyNotes || focusNextSession) && (
        <div className="space-y-3">
          {pronunciationNotes && (
            <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3">
              <p className="text-xs text-blue-400 font-medium mb-1">Pronunciation</p>
              <p className="text-gray-300 text-sm">{pronunciationNotes}</p>
            </div>
          )}
          {fluencyNotes && (
            <div className="bg-green-950/30 border border-green-800/30 rounded-xl p-3">
              <p className="text-xs text-green-400 font-medium mb-1">Fluency</p>
              <p className="text-gray-300 text-sm">{fluencyNotes}</p>
            </div>
          )}
          {focusNextSession && (
            <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-xl p-3">
              <p className="text-xs text-indigo-400 font-medium mb-1">Focus next session</p>
              <p className="text-gray-300 text-sm">{focusNextSession}</p>
            </div>
          )}
        </div>
      )}

      {/* Phrases to practice */}
      {phrasesToPractice && phrasesToPractice.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">
            Phrases to practice ({phrasesToPractice.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {phrasesToPractice.map((p, i) => (
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

      {/* Score */}
      <div>
        <label className="text-gray-400 text-sm block mb-2">
          Score: <span className="text-white font-semibold">{score} / 10</span>
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
            <button
              key={s}
              onClick={() => setScore(s)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                score === s
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-gray-400 text-sm block mb-2">Feedback notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl p-3 text-gray-200 text-sm resize-none focus:outline-none transition-colors placeholder-gray-600"
          placeholder="Notes from the session…"
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-all"
        >
          {saving ? "Saving…" : "Save session"}
        </button>
        <button
          onClick={onDiscard}
          className="px-5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl py-2.5 text-sm font-medium transition-all"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
