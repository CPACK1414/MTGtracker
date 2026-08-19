"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import CounterChip from "@/components/CounterChip";
import CounterBadge from "@/components/CounterBadge";
import DamageGrid from "@/components/DamageGrid";

export type OpponentDamage = {
  id: string;
  name: string;
  amount: number;
};

export default function PlayerCard({
  player,
  isLethal,
  isFirst,
  singleOpponent,
  groupOpponents,
  poison,
  radiation,
  onChangeLife,
  onMarkDead,
  onScoop,
  onRevive,
  onRotate,
  onChangeCommanderDamage,
  onOpenCounters,
}: {
  player: Player;
  isLethal: boolean;
  isFirst: boolean;
  singleOpponent?: OpponentDamage;
  groupOpponents?: OpponentDamage[];
  poison: number;
  radiation: number;
  onChangeLife: (delta: number) => void;
  onMarkDead: () => void;
  onScoop: () => void;
  onRevive: () => void;
  onRotate: () => void;
  onChangeCommanderDamage: (fromOpponentId: string, delta: number) => void;
  onOpenCounters: () => void;
}) {
  const [confirmingElimination, setConfirmingElimination] = useState(false);

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
      {singleOpponent && (
        <div className="mb-1 flex justify-center">
          <CounterChip
            label={singleOpponent.name}
            value={singleOpponent.amount}
            disabled={player.eliminated}
            onChange={(delta) => onChangeCommanderDamage(singleOpponent.id, delta)}
          />
        </div>
      )}

      {!singleOpponent && groupOpponents && (
        <div className="mb-1 flex justify-center">
          <DamageGrid opponents={groupOpponents} onOpen={onOpenCounters} />
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
          {player.eliminated ? (
            <button
              onClick={onRevive}
              className="rounded-full bg-neutral-700 px-2 py-1 text-xs font-bold text-neutral-300 active:scale-95"
            >
              Revive
            </button>
          ) : confirmingElimination ? (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setConfirmingElimination(false);
                  onMarkDead();
                }}
                className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold text-white active:scale-95"
              >
                Dead
              </button>
              <button
                onClick={() => {
                  setConfirmingElimination(false);
                  onScoop();
                }}
                className="rounded-full bg-neutral-700 px-2 py-1 text-[10px] font-bold text-neutral-300 active:scale-95"
              >
                Scoop
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingElimination(true)}
              className={`rounded-full px-2 py-1 text-xs font-bold ${
                isLethal ? "bg-red-600 text-white animate-pulse" : "bg-neutral-800 text-neutral-500"
              }`}
            >
              Dead
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex flex-1 items-center justify-center text-center text-6xl font-black tabular-nums ${lifeColor}`}
      >
        {player.life}
      </div>

      <div className="mb-2 flex justify-center gap-2">
        <CounterBadge label="Poison" icon="/poison-counter.png" value={poison} onClick={onOpenCounters} />
        <CounterBadge label="Radiation" emoji="☢" value={radiation} onClick={onOpenCounters} />
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
