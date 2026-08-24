"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import GameTimer from "@/components/GameTimer";

export default function EndGameModal({
  players,
  saving,
  error,
  gameStartedAt,
  onCancel,
  onConfirm,
}: {
  players: Player[];
  saving: boolean;
  error: string | null;
  gameStartedAt: number | null;
  onCancel: () => void;
  onConfirm: (winnerId: string) => void;
}) {
  const alive = players.filter((p) => !p.eliminated);
  const [winnerId, setWinnerId] = useState<string | null>(
    alive.length === 1 ? alive[0].id : null
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 sm:items-center sm:justify-center">
      <div className="flex max-h-[85vh] flex-col rounded-t-3xl bg-neutral-900 p-5 sm:w-full sm:max-w-sm sm:rounded-3xl">
        <h2 className="text-lg font-bold text-white">Who won?</h2>
        <p className="mt-1 text-sm text-neutral-400">
          This saves the game to everyone&apos;s history.
        </p>
        {gameStartedAt && (
          <p className="mt-1 text-xs text-neutral-500">
            Game time: <GameTimer startedAt={gameStartedAt} />
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 overflow-y-auto">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => setWinnerId(p.id)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                winnerId === p.id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-neutral-800 bg-neutral-800/40"
              }`}
            >
              <div>
                <p className="font-semibold text-white">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {p.eliminated ? "Eliminated" : `${p.life} life`}
                  {p.commander ? ` · ${p.commander}` : ""}
                </p>
              </div>
              {winnerId === p.id && <span className="text-emerald-400">🏆</span>}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-2xl bg-neutral-800 py-4 font-semibold text-neutral-300 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={!winnerId || saving}
            onClick={() => winnerId && onConfirm(winnerId)}
            className="flex-1 rounded-2xl bg-emerald-500 py-4 font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Game"}
          </button>
        </div>
      </div>
    </div>
  );
}
