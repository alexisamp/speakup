"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getUserKey } from "@/lib/userKey";

interface DayData {
  date: string;
  score: number | null;
  notes: string | null;
  duration_minutes: number | null;
}

interface TooltipState {
  x: number;
  y: number;
  data: DayData;
}

function scoreColor(score: number | null): string {
  if (score === null) return "#1f2937";
  if (score <= 4) return "#ffb3b3";
  if (score <= 6) return "#ffd700";
  if (score <= 8) return "#90ee90";
  return "#216e39";
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calcStreak(map: Map<string, DayData>): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(today);

  const todayKey = d.toISOString().split("T")[0];
  const todayEntry = map.get(todayKey);
  if (!todayEntry || (todayEntry.duration_minutes ?? 0) < 10) {
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const key = d.toISOString().split("T")[0];
    const entry = map.get(key);
    if (entry && (entry.duration_minutes ?? 0) >= 10) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function avgScore(map: Map<string, DayData>, days: number): number | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const scores = [...map.values()]
    .filter(
      (d) =>
        new Date(d.date) >= cutoff &&
        d.score !== null &&
        (d.duration_minutes ?? 0) >= 10
    )
    .map((d) => d.score as number);
  if (!scores.length) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export default function Heatmap({ refreshKey }: { refreshKey: number }) {
  const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userKey = getUserKey();
    if (!userKey) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 364);

    supabase
      .from("sessions")
      .select("session_date, score, notes, duration_minutes, created_at")
      .eq("user_key", userKey)
      .gte("session_date", cutoff.toISOString().split("T")[0])
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Heatmap load failed:", error);
        if (!data) return;
        const map = new Map<string, DayData>();
        for (const s of data) {
          if (!map.has(s.session_date)) {
            map.set(s.session_date, {
              date: s.session_date,
              score: s.score,
              notes: s.notes,
              duration_minutes: s.duration_minutes,
            });
          }
        }
        setDayMap(map);
      });
  }, [refreshKey]);

  // Build 365-day grid
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: DayData[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const session = dayMap.get(key);
    days.push({
      date: key,
      score: session?.score ?? null,
      notes: session?.notes ?? null,
      duration_minutes: session?.duration_minutes ?? null,
    });
  }

  // Pad to start on Sunday
  const firstDayOfWeek = new Date(days[0].date + "T00:00:00").getDay();
  const padded: (DayData | null)[] = [...Array(firstDayOfWeek).fill(null), ...days];

  // Group into weeks
  const weeks: (DayData | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  // Month labels
  const monthLabels: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week.find((d) => d !== null);
    if (first) {
      const m = new Date(first.date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          weekIdx: wi,
          label: new Date(first.date + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
          }),
        });
        lastMonth = m;
      }
    }
  });

  const streak = calcStreak(dayMap);
  const avg7 = avgScore(dayMap, 7);
  const avg30 = avgScore(dayMap, 30);

  const CELL = 11;
  const GAP = 3;

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>, day: DayData) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, data: day });
  }

  return (
    <div className="w-full space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Day streak", value: streak },
          { label: "Avg (7d)", value: avg7 ?? "–" },
          { label: "Avg (30d)", value: avg30 ?? "–" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center"
          >
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="relative overflow-x-auto heatmap-scroll" ref={containerRef}>
        <div style={{ display: "inline-flex", flexDirection: "column", minWidth: "fit-content" }}>
          {/* Month labels row */}
          <div style={{ display: "flex", gap: GAP, marginLeft: 24, marginBottom: 4 }}>
            {weeks.map((_, wi) => {
              const ml = monthLabels.find((m) => m.weekIdx === wi);
              return (
                <div
                  key={wi}
                  style={{ width: CELL, position: "relative", overflow: "visible" }}
                >
                  {ml && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        fontSize: 9,
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ml.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day labels + cells */}
          <div style={{ display: "flex", gap: GAP }}>
            {/* Day-of-week labels */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: GAP,
                width: 20,
              }}
            >
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div
                  key={i}
                  style={{
                    height: CELL,
                    fontSize: 9,
                    color: "#4b5563",
                    lineHeight: `${CELL}px`,
                    textAlign: "right",
                    paddingRight: 2,
                  }}
                >
                  {i % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      backgroundColor: day ? scoreColor(day.score) : "transparent",
                      opacity: day ? 1 : 0,
                    }}
                    onMouseEnter={day ? (e) => handleMouseEnter(e, day) : undefined}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-50 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl pointer-events-none text-xs"
            style={{
              left: Math.min(tooltip.x + 12, 320),
              top: tooltip.y - 72,
              minWidth: 140,
              maxWidth: 220,
            }}
          >
            <div className="text-gray-300 font-medium mb-1">
              {fmtDate(tooltip.data.date)}
            </div>
            {tooltip.data.score !== null ? (
              <>
                <div className="text-white">Score: {tooltip.data.score}/10</div>
                {tooltip.data.duration_minutes && (
                  <div className="text-gray-500">{tooltip.data.duration_minutes} min</div>
                )}
                {tooltip.data.notes && (
                  <div className="text-gray-400 mt-1 leading-relaxed">
                    {tooltip.data.notes.length > 100
                      ? tooltip.data.notes.slice(0, 100) + "…"
                      : tooltip.data.notes}
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500">No session</div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Low</span>
        {([null, 3, 5, 7, 10] as (number | null)[]).map((s, i) => (
          <div
            key={i}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 2,
              backgroundColor: scoreColor(s),
            }}
          />
        ))}
        <span>High</span>
        <span className="ml-2 text-gray-600">· streak counts sessions ≥ 10 min</span>
      </div>
    </div>
  );
}
