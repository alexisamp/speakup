"use client";

import { useState } from "react";
import ConversationPanel, {
  type SessionEndData,
} from "@/components/ConversationPanel";
import SaveSessionPanel from "@/components/SaveSessionPanel";
import Heatmap from "@/components/Heatmap";

export default function Home() {
  const [sessionData, setSessionData] = useState<SessionEndData | null>(null);
  const [heatmapKey, setHeatmapKey] = useState(0);

  function handleSessionEnd(data: SessionEndData) {
    setSessionData(data);
  }

  function handleSaved() {
    setSessionData(null);
    setHeatmapKey((k) => k + 1);
  }

  function handleDiscard() {
    setSessionData(null);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            SpeakUp
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            English speaking practice tracker
          </p>
        </div>

        {/* Session card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col items-center">
          {sessionData ? (
            <SaveSessionPanel
              {...sessionData}
              onSaved={handleSaved}
              onDiscard={handleDiscard}
            />
          ) : (
            <ConversationPanel onSessionEnd={handleSessionEnd} />
          )}
        </div>

        {/* Heatmap card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Practice history
          </h2>
          <Heatmap refreshKey={heatmapKey} />
        </div>
      </div>
    </main>
  );
}
