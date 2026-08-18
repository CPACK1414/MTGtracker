"use client";

import type { Player } from "@/lib/types";
import CounterChip from "@/components/CounterChip";

export type OpponentDamage = {
  id: string;
  name: string;
  amount: number;
};

export default function PlayerCard({
  player,
  isLethal,
  isFirst,
  leftOpponents,
  rightOpponents,
  poison,
  radiation,
  onChangeLife,
  onToggleEliminate,
  onRotate,
  onChangeCommanderDamage,
  onChangePoison,
  onChangeRadiation,
}: {
  player: Player;
  isLethal: boolean;
  isFirst: boolean;
  leftOpponents: OpponentDamage[];
  rightOpponents: OpponentDamage[];
  poison: number;
  radiation: number;
  onChangeLife: (delta: number) => void;
  onToggleEliminate: () => void;
  onRotate: () => void;
  onChangeCommanderDamage: (fromOpponentId: string, delta: number) => void;
  onChangePoison: (delta: number) => void;
  onChangeRadiation: (delta: number) => void;
}) {
  const lifeColor =
    player.life <= 0
      ? "text-red-500"
      : player.life <= 10
      ? "text-amber-400"
      : "text-neutral-50";

  return (
    <div
      className={`flex h-full w-full flex-col rounded-2xl border p-3 transition-opacity ${
        player.eliminated
          ? "border-neutral-800 bg-neutral-900/50 opacity-50"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      {(leftOpponents.length > 0 || rightOpponents.length > 0) && (
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            {leftOpponents.map((o) => (
              <CounterChip
                key={o.id}
                label={o.name}
                value={o.amount}
                disabled={player.eliminated}
                onChange={(delta) => onChangeCommanderDamage(o.id, delta)}
              />
            ))}
          </div>
          <div className="flex flex-col items-end gap-1">
            {rightOpponents.map((o) => (
              <CounterChip
                key={o.id}
                label={o.name}
                value={o.amount}
                disabled={player.eliminated}
                onChange={(delta) => onChangeCommanderDamage(o.id, delta)}
              />
            ))}
          </div>
        </div>
      )}

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
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onRotate}
            aria-label="Rotate this player's card"
            className="rounded-full bg-neutral-800 px-2 py-1.5 text-sm text-neutral-400 active:scale-95"
          >
            ⟳
          </button>
          <button
            onClick={onToggleEliminate}
            className={`rounded-full px-2 py-1 text-xs font-bold ${
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
      </div>

      <div
        className={`flex flex-1 items-center justify-center text-center text-6xl font-black tabular-nums ${lifeColor}`}
      >
        {player.life}
      </div>

      <div className="mb-2 flex gap-1">
        <CounterChip
          label="Poison"
          icon="/poison-counter.png"
          value={poison}
          color="poison"
          disabled={player.eliminated}
          onChange={onChangePoison}
        />
        <CounterChip
          label="☢"
          value={radiation}
          color="radiation"
          disabled={player.eliminated}
          onChange={onChangeRadiation}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          disabled={player.eliminated}
          onClick={() => onChangeLife(-5)}
          className="rounded-xl bg-neutral-800/60 py-3 text-sm font-semibold text-red-300 active:scale-95 disabled:opacity-30"
        >
          −5
        </button>
        <button
          disabled={player.eliminated}
          onClick={() => onChangeLife(-1)}
          className="rounded-xl bg-neutral-800 py-3 text-2xl font-bold text-red-400 active:scale-95 disabled:opacity-30"
        >
          −
        </button>
        <button
          disabled={player.eliminated}
          onClick={() => onChangeLife(1)}
          className="rounded-xl bg-neutral-800 py-3 text-2xl font-bold text-emerald-400 active:scale-95 disabled:opacity-30"
        >
          +
        </button>
        <button
          disabled={player.eliminated}
          onClick={() => onChangeLife(5)}
          className="rounded-xl bg-neutral-800/60 py-3 text-sm font-semibold text-emerald-300 active:scale-95 disabled:opacity-30"
        >
          +5
        </button>
      </div>

      {isLethal && !player.eliminated && (
        <p className="mt-1 text-center text-xs font-semibold text-red-400">
          Lethal — tap &quot;Out&quot; to eliminate
        </p>
      )}
    </div>
  );
}
