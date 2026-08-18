"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";

export default function PlayerCard({
  player,
  isLethal,
  isFirst,
  onChangeLife,
  onRename,
  onToggleEliminate,
}: {
  player: Player;
  isLethal: boolean;
  isFirst: boolean;
  onChangeLife: (delta: number) => void;
  onRename: (name: string) => void;
  onToggleEliminate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(player.name);

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
        {editing ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              onRename(draftName.trim() || player.name);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="w-full rounded-lg bg-neutral-800 px-2 py-1 text-sm font-semibold text-white outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraftName(player.name);
              setEditing(true);
            }}
            className="truncate text-sm font-semibold text-neutral-300"
          >
            {player.name}
            {isFirst && <span className="ml-1">🎲</span>}
          </button>
        )}
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
