"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import { COMMANDER_DAMAGE_LETHAL } from "@/lib/types";

export default function DamageView({
  players,
  damage,
  onChangeDamage,
}: {
  players: Player[];
  damage: Record<string, Record<string, number>>;
  onChangeDamage: (fromId: string, toId: string, delta: number) => void;
}) {
  const [toId, setToId] = useState(players[0]?.id ?? "");
  const toPlayer = players.find((p) => p.id === toId) ?? players[0];

  if (!toPlayer) return null;

  const fromPlayers = players.filter((p) => p.id !== toPlayer.id);

  return (
    <div className="flex flex-1 flex-col">
      <p className="px-4 pt-3 text-center text-xs uppercase tracking-wide text-neutral-500">
        Commander damage taken by
      </p>
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => setToId(p.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${
              p.id === toPlayer.id
                ? "bg-indigo-500 text-white"
                : "bg-neutral-800 text-neutral-300"
            } ${p.eliminated ? "opacity-40" : ""}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-6">
        {fromPlayers.map((from) => {
          const amount = damage[from.id]?.[toPlayer.id] ?? 0;
          const lethal = amount >= COMMANDER_DAMAGE_LETHAL;
          return (
            <div
              key={from.id}
              className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-neutral-200">
                  {from.name}&apos;s commander
                </p>
                <p
                  className={`text-3xl font-black tabular-nums ${
                    lethal ? "text-red-500" : "text-neutral-50"
                  }`}
                >
                  {amount}
                  {lethal && (
                    <span className="ml-2 align-middle text-xs font-semibold text-red-400">
                      LETHAL
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => onChangeDamage(from.id, toPlayer.id, -1)}
                  className="h-14 w-14 rounded-2xl bg-neutral-800 text-2xl font-bold text-red-400 active:scale-95"
                >
                  −
                </button>
                <button
                  onClick={() => onChangeDamage(from.id, toPlayer.id, 1)}
                  className="h-14 w-14 rounded-2xl bg-neutral-800 text-2xl font-bold text-emerald-400 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
