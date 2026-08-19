"use client";

import { useEffect, useState } from "react";
import { getGamePlayByPlay, type GamePlayByPlayEntry } from "@/app/actions";

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function displayName(name: string, screenName: string | null) {
  return screenName ? `${name} (${screenName})` : name;
}

function describe(entry: GamePlayByPlayEntry): { text: string; color: string } {
  const name = displayName(entry.playerName, entry.playerScreenName);

  if (entry.type === "eliminated") {
    return {
      text: `${name} eliminated${entry.eliminationReason === "scoop" ? " — scooped" : ""}`,
      color: "text-red-400",
    };
  }
  if (entry.type === "revived") {
    return { text: `${name} revived`, color: "text-emerald-400" };
  }

  const parts: string[] = [];
  if (entry.lifeDelta) parts.push(`${entry.lifeDelta > 0 ? "+" : ""}${entry.lifeDelta} life`);
  if (entry.poisonDelta) parts.push(`${entry.poisonDelta > 0 ? "+" : ""}${entry.poisonDelta} poison`);
  if (entry.radiationDelta)
    parts.push(`${entry.radiationDelta > 0 ? "+" : ""}${entry.radiationDelta} radiation`);

  const net = (entry.lifeDelta ?? 0) + (entry.poisonDelta ?? 0) + (entry.radiationDelta ?? 0);
  return {
    text: `${name}: ${parts.join(", ")}`,
    color: net > 0 ? "text-emerald-400" : net < 0 ? "text-red-400" : "text-neutral-300",
  };
}

export default function PlayByPlayModal({
  gameId,
  onClose,
}: {
  gameId: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<GamePlayByPlayEntry[] | null>(null);

  useEffect(() => {
    setEntries(null);
    getGamePlayByPlay(gameId).then(setEntries);
  }, [gameId]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/80 sm:items-center sm:justify-center">
      <div className="flex max-h-[85vh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-neutral-900 p-5 sm:w-full sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Play by Play</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95"
          >
            Done
          </button>
        </div>

        {!entries ? (
          <p className="mt-6 text-center text-sm text-neutral-500">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="mt-6 text-center text-sm text-neutral-500">
            No play-by-play recorded for this game.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => {
              const { text, color } = describe(entry);
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-xl bg-neutral-800/40 px-3 py-2"
                >
                  <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-neutral-500">
                    {formatElapsed(entry.elapsedSeconds)}
                  </span>
                  <span className={`text-sm font-semibold ${color}`}>{text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
