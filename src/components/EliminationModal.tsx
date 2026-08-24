"use client";

import type { EliminationReason } from "@/lib/types";
import type { Rotation } from "@/lib/layout";

export default function EliminationModal({
  playerName,
  rotation,
  onPick,
  onCancel,
}: {
  playerName: string;
  rotation: Rotation;
  onPick: (reason: EliminationReason) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        style={{ transform: `rotate(${rotation}deg)` }}
        className="flex w-[85vmin] max-w-sm flex-col gap-4 rounded-3xl bg-neutral-900 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">How was {playerName} eliminated?</h2>
          <button
            onClick={onCancel}
            className="rounded-full bg-neutral-700 px-4 py-2 text-sm font-bold text-neutral-300 active:scale-95"
          >
            Cancel
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onPick("commanderDamage")}
            className="rounded-2xl bg-neutral-800 py-4 text-base font-bold text-white active:scale-95"
          >
            Commander Damage
          </button>
          <button
            onClick={() => onPick("combatDamage")}
            className="rounded-2xl bg-neutral-800 py-4 text-base font-bold text-white active:scale-95"
          >
            Combat Damage
          </button>
          <button
            onClick={() => onPick("poison")}
            className="rounded-2xl bg-neutral-800 py-4 text-base font-bold text-white active:scale-95"
          >
            Poison
          </button>
          <button
            onClick={() => onPick("scoop")}
            className="rounded-2xl bg-red-950 py-4 text-base font-bold text-red-300 active:scale-95"
          >
            Scoop
          </button>
        </div>
      </div>
    </div>
  );
}
