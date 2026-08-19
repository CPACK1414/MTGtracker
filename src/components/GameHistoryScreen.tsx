"use client";

import { useEffect, useMemo, useState } from "react";
import { getGameHistory, type DateRange, type GameHistoryEntry } from "@/app/actions";
import { MAX_POD_SIZE, MIN_POD_SIZE } from "@/lib/types";
import GameDetailModal from "@/components/GameDetailModal";

type TimeRangeKey = "all" | "7d" | "30d" | "90d" | "1y" | "custom";

const POD_SIZES = Array.from(
  { length: MAX_POD_SIZE - MIN_POD_SIZE + 1 },
  (_, i) => i + MIN_POD_SIZE
);

const TIME_RANGES: { key: TimeRangeKey; label: string; days?: number }[] = [
  { key: "all", label: "All time" },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "1y", label: "1 year", days: 365 },
  { key: "custom", label: "Custom" },
];

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

function formatPlayedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GameHistoryScreen({ onBack }: { onBack: () => void }) {
  const [games, setGames] = useState<GameHistoryEntry[] | null>(null);
  const [podSizeFilter, setPodSizeFilter] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const dateRange: DateRange | null = useMemo(() => {
    if (timeRange === "all") return null;
    if (timeRange === "custom") {
      if (!customFrom || !customTo) return null;
      return {
        from: new Date(`${customFrom}T00:00:00`).toISOString(),
        to: new Date(`${customTo}T23:59:59.999`).toISOString(),
      };
    }
    const days = TIME_RANGES.find((r) => r.key === timeRange)?.days ?? 0;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [timeRange, customFrom, customTo]);

  useEffect(() => {
    if (timeRange === "custom" && !dateRange) return;
    getGameHistory(podSizeFilter, dateRange).then(setGames);
  }, [podSizeFilter, dateRange, timeRange]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
          ← Back
        </button>
        <h1 className="text-base font-bold text-white">Game History</h1>
        <span className="w-12" />
      </header>

      <div className="flex gap-1 overflow-x-auto px-4 pt-3">
        <button
          onClick={() => setPodSizeFilter(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
            podSizeFilter === null ? "bg-emerald-500 text-white" : "bg-neutral-900 text-neutral-400"
          }`}
        >
          All pod sizes
        </button>
        {POD_SIZES.map((size) => (
          <button
            key={size}
            onClick={() => setPodSizeFilter(size)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              podSizeFilter === size ? "bg-emerald-500 text-white" : "bg-neutral-900 text-neutral-400"
            }`}
          >
            {size} players
          </button>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto px-4 pt-2">
        {TIME_RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setTimeRange(r.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              timeRange === r.key ? "bg-indigo-500 text-white" : "bg-neutral-900 text-neutral-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {timeRange === "custom" && (
        <div className="flex items-center gap-2 px-4 pt-2 text-sm">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2 text-white outline-none"
          />
          <span className="shrink-0 text-neutral-500">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2 text-white outline-none"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!games ? (
          <p className="mt-10 text-center text-sm text-neutral-500">Loading…</p>
        ) : games.length === 0 ? (
          <p className="mt-10 text-center text-sm text-neutral-500">
            No games match these filters.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {games.map((g) => (
              <button
                key={g.gameId}
                onClick={() => setSelectedGameId(g.gameId)}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-left active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-200">
                    {formatPlayedAt(g.playedAt)}
                  </span>
                  <span className="shrink-0 text-sm font-black text-emerald-400">
                    {g.winnerName ? (
                      <>
                        {g.winnerName}
                        {g.winnerScreenName && (
                          <span className="font-normal text-emerald-400/70">
                            {" "}
                            ({g.winnerScreenName})
                          </span>
                        )}{" "}
                        won
                      </>
                    ) : (
                      "No winner"
                    )}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-neutral-500">
                  <span className="truncate">{g.podSize}-player pod</span>
                  <span className="shrink-0 tabular-nums">{formatDuration(g.durationSeconds)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedGameId && (
        <GameDetailModal gameId={selectedGameId} onClose={() => setSelectedGameId(null)} />
      )}
    </div>
  );
}
