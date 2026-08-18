"use client";

import type { Player } from "@/lib/types";

export default function PlayerCard({
  player,
  isLethal,
  isFirst,
  onChangeLife,
  onToggleEliminate,
}: {
  player: Player;
  isLethal: boolean;
  isFirst: boolean;
  onChangeLife: (delta: number) => void;
  onToggleEliminate: () => void;
}) {
  const lifeColor =
    player.life <= 0
      ? "text-red-500"
      : player.life <= 10
      ? "text-amber-400"
      : "text-neutral-50";

  return (
    <div
      className={`flex flex-col rounded-2xl border p-3 transition-opacity ${
        player.eliminated
          ? "border-neutral-800 bg-neutral-900/50 opacity-50"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-300">
            {player.name}
            {isFirst && <span className="ml-1">🎲</span>}
          </p>
          {(player.deckName || player.commander) && (
            <p className="truncate text-xs text-neutral-500">
              {player.commander || player.deckName}
            </p>
          )}
        </div>
        <button
          onClick={onToggleEliminate}
          className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
            player.eliminated
              ? "bg-neutral-700 text-neutral-300"
              : isLethal
              ? "bg-red-600 text-white animate-pulse"
              : "bg-neutral-800 text-neutral-500"
          }`}
        >
          {player.eliminated ? "Revive" : "Out"}
        </button>
      </div>

      <div className={`text-center text-6xl font-black tabular-nums ${lifeColor}`}>
        {player.life}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          disabled={player.eliminated}
          onClick={() => onChangeLife(-1)}
          className="rounded-2xl bg-neutral-800 py-6 text-3xl font-bold text-red-400 active:scale-95 disabled:opacity-30"
        >
          −
        </button>
        <button
          disabled={player.eliminated}
          onClick={() => onChangeLife(1)}
          className="rounded-2xl bg-neutral-800 py-6 text-3xl font-bold text-emerald-400 active:scale-95 disabled:opacity-30"
        >
          +
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          disabled={player.eliminated}
          onClick={() => onChangeLife(-5)}
          className="rounded-xl bg-neutral-800/60 py-2 text-sm font-semibold text-red-300 active:scale-95 disabled:opacity-30"
        >
          −5
        </button>
        <button
          disabled={player.eliminated}
          onClick={() => onChangeLife(5)}
          className="rounded-xl bg-neutral-800/60 py-2 text-sm font-semibold text-emerald-300 active:scale-95 disabled:opacity-30"
        >
          +5
        </button>
      </div>

      {isLethal && !player.eliminated && (
        <p className="mt-2 text-center text-xs font-semibold text-red-400">
          Lethal — tap &quot;Out&quot; to eliminate
        </p>
      )}
    </div>
  );
}
