import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const USER_KEY = process.env.SPEAKUP_USER_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const server = new Server(
  { name: "speakup", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_sessions",
      description: "Get practice sessions from SpeakUp ordered by date descending",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max sessions to return (default 20)" },
          days: { type: "number", description: "Only sessions from last N days" },
        },
      },
    },
    {
      name: "get_vocabulary",
      description: "Get tracked vocabulary phrases ordered by frequency (times_seen)",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max phrases to return (default 50)" },
        },
      },
    },
    {
      name: "get_streak",
      description: "Get current practice streak (only sessions >= 10 min count toward streak)",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_transcripts",
      description: "Get session transcripts and raw feedback text for analysis",
      inputSchema: {
        type: "object",
        properties: {
          days: { type: "number", description: "Only sessions from last N days (default 30)" },
        },
      },
    },
    {
      name: "get_progress_summary",
      description:
        "Get a progress summary: total sessions, avg scores (7d and 30d), top vocabulary errors",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const limit = (args?.limit as number) ?? 20;
  const days = (args?.days as number) ?? 30;

  function applyUserKey<T extends ReturnType<typeof supabase.from>>(query: T) {
    if (USER_KEY) return query.eq("user_key", USER_KEY);
    return query;
  }

  if (name === "get_sessions") {
    let query = supabase
      .from("sessions")
      .select(
        "id, session_date, score, duration_minutes, pronunciation_notes, fluency_notes, focus_next_session, phrases_to_practice, created_at"
      )
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (args?.days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      query = query.gte("session_date", cutoff.toISOString().split("T")[0]);
    }
    query = applyUserKey(query) as typeof query;

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }

  if (name === "get_vocabulary") {
    let query = supabase
      .from("vocabulary")
      .select("original_phrase, better_phrase, category, times_seen, session_date")
      .order("times_seen", { ascending: false })
      .limit(limit);

    query = applyUserKey(query) as typeof query;

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }

  if (name === "get_streak") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);

    let query = supabase
      .from("sessions")
      .select("session_date, duration_minutes")
      .gte("session_date", cutoff.toISOString().split("T")[0])
      .order("session_date", { ascending: false });

    query = applyUserKey(query) as typeof query;

    const { data } = await query;
    if (!data) return { content: [{ type: "text" as const, text: "Current streak: 0 days" }] };

    const qualified = new Set(
      data.filter((r) => (r.duration_minutes ?? 0) >= 10).map((r) => r.session_date)
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(today);
    const todayKey = d.toISOString().split("T")[0];
    if (!qualified.has(todayKey)) d.setDate(d.getDate() - 1);

    while (true) {
      const key = d.toISOString().split("T")[0];
      if (qualified.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    return { content: [{ type: "text" as const, text: `Current streak: ${streak} days` }] };
  }

  if (name === "get_transcripts") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    let query = supabase
      .from("sessions")
      .select("id, session_date, score, duration_minutes, transcript, raw_feedback")
      .gte("session_date", cutoff.toISOString().split("T")[0])
      .order("session_date", { ascending: false })
      .limit(10);

    query = applyUserKey(query) as typeof query;

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }

  if (name === "get_progress_summary") {
    let sessionsQuery = supabase
      .from("sessions")
      .select("session_date, score, duration_minutes");
    let vocabQuery = supabase
      .from("vocabulary")
      .select("original_phrase, better_phrase, times_seen")
      .order("times_seen", { ascending: false })
      .limit(3);

    sessionsQuery = applyUserKey(sessionsQuery) as typeof sessionsQuery;
    vocabQuery = applyUserKey(vocabQuery) as typeof vocabQuery;

    const [{ data: sessions }, { data: vocab }] = await Promise.all([
      sessionsQuery,
      vocabQuery,
    ]);

    const total = sessions?.length ?? 0;
    const now = new Date();
    const cutoff7 = new Date(now);
    cutoff7.setDate(cutoff7.getDate() - 7);
    const cutoff30 = new Date(now);
    cutoff30.setDate(cutoff30.getDate() - 30);

    const scores7 =
      sessions
        ?.filter(
          (s) =>
            new Date(s.session_date) >= cutoff7 &&
            s.score !== null &&
            (s.duration_minutes ?? 0) >= 10
        )
        .map((s) => s.score as number) ?? [];

    const scores30 =
      sessions
        ?.filter(
          (s) =>
            new Date(s.session_date) >= cutoff30 &&
            s.score !== null &&
            (s.duration_minutes ?? 0) >= 10
        )
        .map((s) => s.score as number) ?? [];

    const avg = (arr: number[]) =>
      arr.length
        ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
        : null;

    const summary = {
      total_sessions: total,
      avg_score_7d: avg(scores7),
      avg_score_30d: avg(scores30),
      top_3_errors:
        vocab?.map((v) => ({
          phrase: `${v.original_phrase} → ${v.better_phrase}`,
          times: v.times_seen,
        })) ?? [],
    };

    return { content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }] };
  }

  return { content: [{ type: "text" as const, text: `Unknown tool: ${name}` }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
