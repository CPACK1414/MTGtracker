"use client";

import { useState } from "react";
import type { PlayerProfile } from "@/lib/library";
import { MIN_POD_SIZE, MAX_POD_SIZE } from "@/lib/types";
import PodPlayerRow from "@/components/PodPlayerRow";

const MIN_ROSTER_SIZE = 4;

export default function TournamentSetupScreen({
  players,
  onBack,
  onCreate,
}: {
  players: PlayerProfile[];
  onBack: () => void;
  onCreate: (organizerPlayerId: string, rosterPlayerIds: string[], podSize: number) => void;
}) {
  const [step, setStep] = useState<"roster" | "podSize" | "whichPlayer">("roster");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [podSize, setPodSize] = useState(4);
  const [search, setSearch] = useState("");

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const rosterOk = selectedIds.length >= MIN_ROSTER_SIZE;
  const rosterPlayers = selectedIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerProfile => Boolean(p));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button
          onClick={() => {
            if (step === "roster") onBack();
            else if (step === "podSize") setStep("roster");
            else setStep("podSize");
          }}
          className="text-sm font-semibold text-neutral-400"
        >
          ← Back
        </button>
        <h1 className="text-base font-bold text-white">Tournament</h1>
        <span className="w-12" />
      </header>

      {step === "roster" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-3 text-center text-sm text-neutral-400">
              Pick everyone playing in this tournament — at least {MIN_ROSTER_SIZE}
            </p>

            {players.length === 0 ? (
              <p className="mt-6 text-center text-sm text-neutral-500">
                No players yet — add everyone in your group first.
              </p>
            ) : (
              <>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 Search players"
                  className="mb-3 w-full rounded-xl bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-500"
                />
                <div className="flex flex-col gap-2">
                  {filteredPlayers.map((p) => (
                    <PodPlayerRow
                      key={p.id}
                      player={p}
                      selected={selectedIds.includes(p.id)}
                      onToggleSelect={() => toggleSelect(p.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {players.length > 0 && (
            <div className="border-t border-neutral-800 px-4 py-4">
              <button
                disabled={!rosterOk}
                onClick={() => setStep("podSize")}
                className="w-full rounded-2xl bg-emerald-500 px-8 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-30 disabled:shadow-none"
              >
                {rosterOk
                  ? `Next: Pod Size (${selectedIds.length} players)`
                  : `Pick at least ${MIN_ROSTER_SIZE} players`}
              </button>
            </div>
          )}
        </>
      )}

      {step === "podSize" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <p className="text-center text-sm text-neutral-400">
            How many players per pod?
          </p>
          <div className="flex gap-3">
            {Array.from({ length: MAX_POD_SIZE - MIN_POD_SIZE + 1 }, (_, i) => MIN_POD_SIZE + i).map(
              (size) => (
                <button
                  key={size}
                  onClick={() => setPodSize(size)}
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold active:scale-95 ${
                    podSize === size
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {size}
                </button>
              )
            )}
          </div>
          <button
            onClick={() => setStep("whichPlayer")}
            className="mt-4 w-full max-w-xs rounded-2xl bg-emerald-500 px-8 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Next: Which Player Are You?
          </button>
        </div>
      )}

      {step === "whichPlayer" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-3 text-center text-sm text-neutral-400">
              Which player are you? Your pod plays right here on this phone.
            </p>
            <div className="flex flex-col gap-2">
              {rosterPlayers.map((p) => (
                <PodPlayerRow key={p.id} player={p} selected={false} onToggleSelect={() => onCreate(p.id, selectedIds, podSize)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
