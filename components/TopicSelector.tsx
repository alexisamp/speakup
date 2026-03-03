"use client";

interface Topic {
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
  onSelect: (topic: Topic) => void;
  selected?: string;
}

export default function TopicSelector({ onSelect, selected }: Props) {
  return (
    <div className="w-full">
      <p className="text-gray-500 text-sm mb-4 text-center">Pick a scenario to get started</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TOPICS.map((t) => {
          const isSelected = selected === t.title;
          return (
            <button
              key={t.title}
              onClick={() => onSelect(t)}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-indigo-500 bg-indigo-600/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"
              }`}
            >
              <span className="text-2xl mb-2">{t.emoji}</span>
              <span className="text-white text-sm font-medium leading-tight">{t.title}</span>
              <span className="text-gray-500 text-xs mt-1 leading-tight">{t.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
