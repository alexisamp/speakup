"use client";

import { useState } from "react";
import { PARTNERS, type Partner } from "@/lib/partners";

export interface Topic {
  emoji: string;
  title: string;
  description: string;
  context: string;
}

const TOPICS: Topic[] = [
  {
    emoji: "☕",
    title: "Coffee chat",
    description: "Ran into a friend at a café",
    context: "We just ran into each other at a coffee shop. Start the conversation naturally like you would with a friend you haven't seen in a while.",
  },
  {
    emoji: "✈️",
    title: "Travel story",
    description: "Just got back from a trip",
    context: "You just got back from a trip and want to tell me about it. Start right in the middle of the story.",
  },
  {
    emoji: "💼",
    title: "Job interview",
    description: "Casual chat with a hiring manager",
    context: "This is a casual end-of-interview chat. The formal part is done — we're just getting to know each other. Keep it relaxed.",
  },
  {
    emoji: "🎬",
    title: "Movie debate",
    description: "Discussing something you watched",
    context: "We're debating a movie or show we both watched. Be opinionated and get into it — no need to agree.",
  },
  {
    emoji: "🗞️",
    title: "Current events",
    description: "Chatting about something in the news",
    context: "We're catching up on something interesting that happened recently. React naturally and share your take.",
  },
  {
    emoji: "🎲",
    title: "Free flow",
    description: "No specific topic",
    context: "Just a natural casual conversation. Jump into whatever feels natural — small talk, opinions, stories.",
  },
];

interface Props {
  onStart: (partner: Partner, topic: Topic) => void;
}

export default function TopicSelector({ onStart }: Props) {
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const canStart = selectedPartner !== null && selectedTopic !== null;

  return (
    <div className="w-full space-y-6">
      {/* Partner row */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Who are you talking to?
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PARTNERS.map((partner) => {
            const isSelected = selectedPartner?.disc === partner.disc;
            return (
              <button
                key={partner.disc}
                onClick={() => setSelectedPartner(partner)}
                className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all overflow-hidden ${
                  isSelected
                    ? "bg-gray-800 border-gray-600"
                    : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600"
                }`}
                style={isSelected ? { boxShadow: `0 0 0 1.5px ${partner.color}60` } : {}}
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
                  style={{ backgroundColor: partner.color }}
                />
                <span className="text-base leading-none mb-1.5 pl-2">{partner.emoji}</span>
                <span className="text-white text-xs font-semibold pl-2">{partner.name}</span>
                <span className="text-gray-500 text-xs pl-2 mt-0.5 leading-tight">
                  {partner.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic grid */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          What's the topic?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TOPICS.map((topic) => {
            const isSelected = selectedTopic?.title === topic.title;
            return (
              <button
                key={topic.title}
                onClick={() => setSelectedTopic(topic)}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/20"
                    : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600"
                }`}
              >
                <span className="text-xl mb-2">{topic.emoji}</span>
                <span className="text-white text-sm font-medium">{topic.title}</span>
                <span className="text-gray-500 text-xs mt-0.5">{topic.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => {
          if (selectedPartner && selectedTopic) {
            onStart(selectedPartner, selectedTopic);
          }
        }}
        disabled={!canStart}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/30"
      >
        {canStart
          ? `Start with ${selectedPartner!.name} — ${selectedTopic!.title} →`
          : "Select a partner and topic to start"}
      </button>
    </div>
  );
}
