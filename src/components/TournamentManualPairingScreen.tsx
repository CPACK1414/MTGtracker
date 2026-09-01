"use client";

import { useState } from "react";

type PoolPlayer = { playerId: string; name: string };

export default function TournamentManualPairingScreen({
  players,
  podSize,
  onCancel,
  onSave,
}: {
  players: PoolPlayer[];
  podSize: number;
  onCancel: () => void;
  onSave: (pods: string[][], autoAdvance: string | null) => void;
}) {
  const [committedPods, setCommittedPods] = useState<string[][]>([]);
  const [currentSelection, setCurrentSelection] = useState<string[]>([]);

  const assignedIds = new Set(committedPods.flat());
  const remaining = players.filter((p) => !assignedIds.has(p.playerId));
  const nameById = new Map(players.map((p) => [p.playerId, p.name]));

  function toggle(id: string) {
    setCurrentSelection((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= podSize) return prev;
      return [...prev, id];
    });
  }

  function addPod() {
    if (currentSelection.length < 2) return;
    setCommittedPods((prev) => [...prev, currentSelection]);
    setCurrentSelection([]);
  }

  // Leaving exactly one player unpicked at any point is always fine — it's
  // the legitimate single-leftover auto-advance case (handled by `done`
  // below), same as the automatic generator allows.
  const canAddPod = currentSelection.length >= 2 && currentSelection.length <= podSize;

  const done = remaining.length === 0 || remaining.length === 1;
  const finalAutoAdvance = remaining.length === 1 ? remaining[0].playerId : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button onClick={onCancel} className="text-sm font-semibold text-neutral-400">
          Cancel
        </button>
        <h1 className="text-base font-bold text-white">Manual Pairings</h1>
        <span className="w-12" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {committedPods.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {committedPods.map((pod, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-neutral-800/60 px-3 py-2">
                <span className="text-sm text-neutral-200">
                  {pod.map((id) => nameById.get(id)).join(", ")}
                </span>
                <button
                  onClick={() => setCommittedPods((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-xs text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {!done ? (
          <>
            <p className="mb-3 text-center text-sm text-neutral-400">
              Tap 2–{podSize} players for the next pod
            </p>
            <div className="flex flex-col gap-2">
              {remaining.map((p) => (
                <button
                  key={p.playerId}
                  onClick={() => toggle(p.playerId)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
                    currentSelection.includes(p.playerId)
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-neutral-800 bg-neutral-900"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      currentSelection.includes(p.playerId)
                        ? "bg-emerald-500 text-white"
                        : "bg-neutral-800 text-neutral-600"
                    }`}
                  >
                    {currentSelection.includes(p.playerId) ? "✓" : ""}
                  </span>
                  <span className="text-sm font-semibold text-neutral-100">{p.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-neutral-400">
            {finalAutoAdvance
              ? `${nameById.get(finalAutoAdvance)} is left over and will advance automatically.`
              : "Everyone's paired up."}
          </p>
        )}
      </div>

      <div className="border-t border-neutral-800 px-4 py-4">
        {!done ? (
          <button
            disabled={!canAddPod}
            onClick={addPod}
            className="w-full rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-30 disabled:shadow-none"
          >
            Add Pod
          </button>
        ) : (
          <button
            onClick={() => onSave(committedPods, finalAutoAdvance)}
            className="w-full rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Save Pairings
          </button>
        )}
      </div>
    </div>
  );
}
