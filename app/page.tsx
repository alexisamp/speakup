"use client";

import { useState, useEffect, useCallback } from "react";
import ConversationPanel, { type SessionEndData } from "@/components/ConversationPanel";
import SaveSessionPanel from "@/components/SaveSessionPanel";
import Heatmap from "@/components/Heatmap";
import TopicSelector, { type Topic } from "@/components/TopicSelector";
import PreSessionBrief from "@/components/PreSessionBrief";
import SessionHistory from "@/components/SessionHistory";
import VocabularyView from "@/components/VocabularyView";
import { supabase } from "@/lib/supabase";
import { getUserKey } from "@/lib/userKey";
import { PARTNERS, type Partner } from "@/lib/partners";
import { syncAgents } from "@/lib/syncAgents";

type AppView = "topic" | "brief" | "session" | "save";
type ActiveTab = "practice" | "history" | "vocabulary";

interface SelectedTopic {
  title: string;
  context: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("practice");
  const [view, setView] = useState<AppView>("topic");
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);
  const [sessionContext, setSessionContext] = useState("");
  const [sessionData, setSessionData] = useState<SessionEndData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [streak, setStreak] = useState<number>(0);
  const [fromExtension, setFromExtension] = useState(false);
  const [extensionContext, setExtensionContext] = useState("");

  const fetchStreak = useCallback(async () => {
    const userKey = getUserKey();
    if (!userKey) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);

    const { data } = await supabase
      .from("sessions")
      .select("session_date, duration_minutes")
      .eq("user_key", userKey)
      .gte("session_date", cutoff.toISOString().split("T")[0])
      .order("session_date", { ascending: false });

    if (!data) return;

    const qualified = new Set(
      data.filter((r) => (r.duration_minutes ?? 0) >= 10).map((r) => r.session_date)
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
  }, []);

  useEffect(() => {
    // Sync agents to Supabase (non-blocking)
    syncAgents().catch(console.error);

    // Handle URL params from Chrome extension
    const params = new URLSearchParams(window.location.search);
    const ctxParam = params.get("context");
    const partnerParam = params.get("partner");
    if (ctxParam && partnerParam) {
      const partner = PARTNERS.find((p) => p.disc === partnerParam);
      if (partner) {
        setSelectedPartner(partner);
        setSelectedTopic({ title: "Free flow", context: "" });
        setExtensionContext(ctxParam);
        setFromExtension(true);
        setView("brief");
      }
    }

    fetchStreak();
  }, [fetchStreak]);

  function handleStart(partner: Partner, topic: Topic) {
    setSelectedPartner(partner);
    setSelectedTopic({ title: topic.title, context: topic.context });
    setFromExtension(false);
    setExtensionContext("");
    setView("brief");
  }

  function handleBriefStart(context: string) {
    setSessionContext(context);
    setView("session");
  }

  function handleSessionEnd(data: SessionEndData) {
    setSessionData(data);
    setView("save");
  }

  function handleSaved() {
    setSessionData(null);
    setSelectedPartner(null);
    setSelectedTopic(null);
    setFromExtension(false);
    setExtensionContext("");
    setView("topic");
    setRefreshKey((k) => k + 1);
  }

  function handleDiscard() {
    setSessionData(null);
    setSelectedPartner(null);
    setSelectedTopic(null);
    setFromExtension(false);
    setExtensionContext("");
    setView("topic");
  }

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: "practice", label: "Practice" },
    { id: "history", label: "History" },
    { id: "vocabulary", label: "Vocabulary" },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              SpeakUp
              {view === "session" && selectedPartner ? (
                <span className="text-base font-normal text-gray-300">
                  {streak > 0 && <span className="text-orange-400">🔥 {streak} </span>}
                  | {selectedPartner.emoji} {selectedPartner.name}
                </span>
              ) : (
                streak > 0 && (
                  <span className="text-base font-normal text-orange-400">🔥 {streak}</span>
                )
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">English speaking practice</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Practice tab */}
        {activeTab === "practice" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8">
            {view === "topic" && <TopicSelector onStart={handleStart} />}
            {view === "brief" && selectedTopic && (
              <PreSessionBrief
                topic={selectedTopic.title}
                topicContext={selectedTopic.context}
                onStart={handleBriefStart}
                onBack={() => {
                  setFromExtension(false);
                  setExtensionContext("");
                  setView("topic");
                }}
                fromExtension={fromExtension}
                initialContext={extensionContext || undefined}
              />
            )}
            {view === "session" && selectedTopic && selectedPartner && (
              <ConversationPanel
                topic={selectedTopic.title}
                context={sessionContext}
                partner={selectedPartner}
                onSessionEnd={handleSessionEnd}
              />
            )}
            {view === "save" && sessionData && (
              <SaveSessionPanel
                {...sessionData}
                onSaved={handleSaved}
                onDiscard={handleDiscard}
              />
            )}
          </div>
        )}

        {/* History tab */}
        {activeTab === "history" && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Practice calendar
              </h2>
              <Heatmap refreshKey={refreshKey} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Sessions
              </h2>
              <SessionHistory refreshKey={refreshKey} />
            </div>
          </>
        )}

        {/* Vocabulary tab */}
        {activeTab === "vocabulary" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Vocabulary tracker
            </h2>
            <VocabularyView refreshKey={refreshKey} />
          </div>
        )}
      </div>
    </main>
  );
}
