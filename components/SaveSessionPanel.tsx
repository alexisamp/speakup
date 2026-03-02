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

    const { error: err } = await supabase.from("sessions").insert({
      user_key: userKey,
      session_date: new Date().toISOString().split("T")[0],
      score,
      notes: notes.trim() || null,
      duration_minutes: duration,
    });

    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      onSaved();
    }
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Session complete</h3>
        <span className="text-gray-500 text-sm">{duration} min</span>
      </div>

      {/* Score */}
      <div>
        <label className="text-gray-400 text-sm block mb-2">
          Score:{" "}
          <span className="text-white font-semibold">{score} / 10</span>
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
        <label className="text-gray-400 text-sm block mb-2">
          Feedback notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
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
