"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserKey } from "@/lib/userKey";

interface VocabItem {
  id: string;
  original_phrase: string;
  better_phrase: string;
  category: string;
  times_seen: number;
  session_date: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  pronunciation: "Pronunciation",
  fluency: "Fluency",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
};

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    pronunciation: "bg-blue-900/50 text-blue-300 border-blue-700/50",
    fluency: "bg-green-900/50 text-green-300 border-green-700/50",
    grammar: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
    vocabulary: "bg-purple-900/50 text-purple-300 border-purple-700/50",
    general: "bg-gray-800/50 text-gray-400 border-gray-700/50",
  };
  return map[cat] ?? map.general;
}

export default function VocabularyView({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    const userKey = getUserKey();
    if (!userKey) return;

    setLoading(true);
    supabase
      .from("vocabulary")
      .select("*")
      .eq("user_key", userKey)
      .order("times_seen", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Vocabulary load failed:", error);
        setItems(data ?? []);
        setLoading(false);
      });
  }, [refreshKey]);

  const categories = ["all", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600 text-sm">
        Loading vocabulary…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p className="text-lg mb-2">No phrases yet</p>
        <p className="text-sm">Phrases from your session feedback will appear here.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600"
              }`}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat] ?? cat}
              {cat === "all" && ` (${items.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-400 text-sm line-through">{item.original_phrase}</span>
                <span className="text-gray-600">→</span>
                <span className="text-green-400 text-sm font-medium">{item.better_phrase}</span>
              </div>
              {item.session_date && (
                <p className="text-gray-600 text-xs mt-1">
                  First seen {new Date(item.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColor(item.category)}`}>
                {CATEGORY_LABELS[item.category] ?? item.category}
              </span>
              {item.times_seen > 1 && (
                <span className="text-xs bg-red-900/40 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full">
                  ×{item.times_seen}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-gray-600 text-xs text-center">
        {filtered.length} phrase{filtered.length !== 1 ? "s" : ""} tracked
      </p>
    </div>
  );
}
