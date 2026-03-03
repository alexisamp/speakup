export interface Partner {
  disc: string;
  name: string;
  color: string;
  emoji: string;
  label: string;
  description: string;
  agentId: string;
  voiceId: string;
}

export const PARTNERS: Partner[] = [
  {
    disc: "D",
    name: "Jordan",
    color: "#ef4444",
    emoji: "🔴",
    label: "Direct & Fast",
    description: "Cuts to the point. Will push you.",
    agentId: process.env.NEXT_PUBLIC_AGENT_D ?? "",
    voiceId: "nPczCjzI2devNBz1zQrb",
  },
  {
    disc: "I",
    name: "Sam",
    color: "#f59e0b",
    emoji: "🟡",
    label: "Energetic & Fun",
    description: "Jumps topics. Laughs. Keeps it real.",
    agentId: process.env.NEXT_PUBLIC_AGENT_I ?? "",
    voiceId: "9BWtsMINqrJLrRacOk9x",
  },
  {
    disc: "S",
    name: "Alex",
    color: "#22c55e",
    emoji: "🟢",
    label: "Warm & Patient",
    description: "Listens deeply. Asks hard questions.",
    agentId: process.env.NEXT_PUBLIC_AGENT_S ?? "",
    voiceId: "N2lVS1w4EtoT3dr4eOWO",
  },
  {
    disc: "C",
    name: "Morgan",
    color: "#3b82f6",
    emoji: "🔵",
    label: "Precise & Analytical",
    description: "Challenges your logic. Demands clarity.",
    agentId: process.env.NEXT_PUBLIC_AGENT_C ?? "",
    voiceId: "onwK4e9ZLuTAKqWW03F9",
  },
];
