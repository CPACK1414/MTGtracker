"use client";

import { useEffect, useState } from "react";
import { getPlayerGameHistory, type PlayerGameHistoryEntry } from "@/app/actions";

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

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

export default function PlayerHistoryModal({
  playerId,
  playerName,
  onClose,
}: {
  playerId: string;
  playerName: string;
  onClose: () => void;
}) {
  const [games, setGames] = useState<PlayerGameHistoryEntry[] | null>(null);

  useEffect(() => {
    setGames(null);
    getPlayerGameHistory(playerId).then(setGames);
  }, [playerId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 sm:items-center sm:justify-center">
      <div className="flex max-h-[85vh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-neutral-900 p-5 sm:w-full sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{playerName}&apos;s Games</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95"
          >
            Done
          </button>
        </div>

        {!games ? (
          <p className="mt-6 text-center text-sm text-neutral-500">Loading…</p>
        ) : games.length === 0 ? (
          <p className="mt-6 text-center text-sm text-neutral-500">No games played yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {games.map((g) => (
              <div
                key={g.gameId}
                className="rounded-2xl border border-neutral-800 bg-neutral-800/40 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-200">
                    {formatPlayedAt(g.playedAt)}
                  </span>
                  <span
                    className={`shrink-0 text-sm font-black ${
                      g.won
                        ? "text-emerald-400"
                        : g.eliminationReason === "scoop"
                        ? "text-red-500"
                        : "text-neutral-500"
                    }`}
                  >
                    {g.won ? "Win" : g.placement ? `${ordinal(g.placement)} place` : "Loss"}
                    {g.eliminationReason === "scoop" && " · Scooped"}
                  </span>
                </div>
                {(g.commander || g.deckName) && (
                  <p className="mt-1 truncate text-sm text-neutral-300">
                    {g.commander || g.deckName}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-neutral-500">
                  <span className="truncate">{g.podSize}-player pod</span>
                  <span className="shrink-0 tabular-nums">{formatDuration(g.durationSeconds)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
