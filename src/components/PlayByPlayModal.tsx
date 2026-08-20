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

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

function describe(
  entry: GamePlayByPlayEntry,
  placement: number | null | undefined
): { text: string; color: string; suffix?: string } {
  const name = displayName(entry.playerName, entry.playerScreenName);

  if (entry.type === "eliminated") {
    return {
      text: `${name} eliminated${entry.eliminationReason === "scoop" ? " — scooped" : ""}`,
      color: "text-red-400",
      suffix: placement ? `${ordinal(placement)} place` : undefined,
    };
  }
  if (entry.type === "revived") {
    return { text: `${name} revived`, color: "text-emerald-400" };
  }

  const parts: string[] = [];
  if (entry.lifeDelta) parts.push(`${entry.lifeDelta > 0 ? "+" : ""}${entry.lifeDelta} life`);
  if (entry.commanderDamageDelta)
    parts.push(
      `${entry.commanderDamageDelta > 0 ? "+" : ""}${entry.commanderDamageDelta} commander damage`
    );
  if (entry.poisonDelta) parts.push(`${entry.poisonDelta > 0 ? "+" : ""}${entry.poisonDelta} poison`);
  if (entry.radiationDelta)
    parts.push(`${entry.radiationDelta > 0 ? "+" : ""}${entry.radiationDelta} radiation`);

  const net =
    (entry.lifeDelta ?? 0) +
    (entry.commanderDamageDelta ?? 0) +
    (entry.poisonDelta ?? 0) +
    (entry.radiationDelta ?? 0);
  return {
    text: `${name}: ${parts.join(", ")}`,
    color: net > 0 ? "text-emerald-400" : net < 0 ? "text-white" : "text-neutral-300",
  };
}

export default function PlayByPlayModal({
  gameId,
  winnerName,
  winnerScreenName,
  placements,
  onClose,
}: {
  gameId: string;
  winnerName: string | null;
  winnerScreenName: string | null;
  placements: Record<string, number | null>;
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
        ) : (
          <div className="flex flex-col gap-2">
            {entries.length === 0 && (
              <p className="mt-6 text-center text-sm text-neutral-500">
                No play-by-play recorded for this game.
              </p>
            )}
            {entries.map((entry) => {
              const { text, color, suffix } = describe(entry, placements[entry.playerId]);
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-xl bg-neutral-800/40 px-3 py-2"
                >
                  <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-neutral-500">
                    {formatElapsed(entry.elapsedSeconds)}
                  </span>
                  <span className="text-sm font-semibold">
                    <span className={color}>{text}</span>
                    {suffix && <span className="text-white"> · {suffix}</span>}
                  </span>
                </div>
              );
            })}
            {winnerName && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2">
                <span className="text-sm font-bold text-emerald-400">
                  🏆 {displayName(winnerName, winnerScreenName)} wins
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
