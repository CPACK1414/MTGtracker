"use client";

import { useEffect, useState } from "react";
import {
  getGameLifeChart,
  getGamePlayByPlay,
  type GameLifeChart,
  type GamePlayByPlay,
  type GamePlayByPlayEntry,
} from "@/app/actions";
import LifeChart from "@/components/LifeChart";

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

function eliminationLabel(reason: "commanderDamage" | "combatDamage" | "scoop" | null): string {
  if (reason === "commanderDamage") return "commander damage";
  if (reason === "combatDamage") return "combat damage";
  if (reason === "scoop") return "scooped";
  return "eliminated";
}

function describe(
  entry: GamePlayByPlayEntry,
  placement: number | null | undefined
): { text: string; color: string; suffix?: string } {
  const name = displayName(entry.playerName, entry.playerScreenName);

  if (entry.type === "eliminated") {
    return {
      text: `${name} eliminated — ${eliminationLabel(entry.eliminationReason)}`,
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

function EntryRow({
  entry,
  placement,
}: {
  entry: GamePlayByPlayEntry;
  placement: number | null | undefined;
}) {
  const { text, color, suffix } = describe(entry, placement);
  return (
    <div className="flex items-start gap-3 rounded-xl bg-neutral-800/40 px-3 py-2">
      <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-neutral-500">
        {formatElapsed(entry.elapsedSeconds)}
      </span>
      <span className="text-sm font-semibold">
        <span className={color}>{text}</span>
        {suffix && <span className="text-white"> · {suffix}</span>}
      </span>
    </div>
  );
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
  const [data, setData] = useState<GamePlayByPlay | null>(null);
  const [chart, setChart] = useState<GameLifeChart | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    setData(null);
    setChart(null);
    setShowGraph(false);
    getGamePlayByPlay(gameId).then(setData);
    getGameLifeChart(gameId).then(setChart);
  }, [gameId]);

  const isEmpty = data && !data.hasTurnData && data.flatEntries.length === 0;
  const isEmptyBrackets = data && data.hasTurnData && data.brackets.every((b) => b.entries.length === 0);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/80 sm:items-center sm:justify-center">
      <div className="flex max-h-[85vh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-neutral-900 p-5 sm:w-full sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white">Play by Play</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGraph(true)}
              className="rounded-full bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-300 active:scale-95"
            >
              📈 Graph
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95"
            >
              Done
            </button>
          </div>
        </div>

        {!data ? (
          <p className="mt-6 text-center text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(isEmpty || isEmptyBrackets) && (
              <p className="mt-6 text-center text-sm text-neutral-500">
                No play-by-play recorded for this game.
              </p>
            )}

            {data.hasTurnData
              ? data.brackets.map((bracket, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                      {displayName(bracket.turnPlayerName, bracket.turnPlayerScreenName)}&apos;s Turn
                      {bracket.durationSeconds != null
                        ? ` · ${formatElapsed(bracket.durationSeconds)}`
                        : " (in progress)"}
                    </p>
                    <div className="flex flex-col gap-2">
                      {bracket.entries.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} placement={placements[entry.playerId]} />
                      ))}
                    </div>
                  </div>
                ))
              : data.flatEntries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} placement={placements[entry.playerId]} />
                ))}

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

      {showGraph && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95">
          <div
            style={{ width: "100vh", height: "100vw", transform: "rotate(90deg)" }}
            className="flex shrink-0 flex-col gap-2 p-3"
          >
            <div className="flex shrink-0 items-center justify-between px-2">
              <h2 className="text-base font-bold text-white">Life Totals</h2>
              <button
                onClick={() => setShowGraph(false)}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95"
              >
                Done
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {!chart ? (
                <p className="text-center text-sm text-neutral-500">Loading…</p>
              ) : chart.hasData ? (
                <LifeChart chart={chart} />
              ) : (
                <p className="text-center text-sm text-neutral-500">
                  Not enough data recorded for this game.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
