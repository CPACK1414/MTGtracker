"use client";

import { useState } from "react";
import type { PlayerProfile } from "@/lib/library";
import { MAX_POD_SIZE, MIN_POD_SIZE, type PodSelection } from "@/lib/types";
import PodPlayerRow from "@/components/PodPlayerRow";
import SeatAssignScreen from "@/components/SeatAssignScreen";

export default function PodSetupScreen({
  players,
  onBack,
  onManagePlayers,
  onStart,
}: {
  players: PlayerProfile[];
  onBack: () => void;
  onManagePlayers: () => void;
  onStart: (selections: PodSelection[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deckChoice, setDeckChoice] = useState<Record<string, string | null>>({});
  const [showSeats, setShowSeats] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_POD_SIZE) return prev;
      return [...prev, id];
    });
  }

  function buildSelections(): PodSelection[] {
    return selectedIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => {
        const dId = deckChoice[p.id] ?? null;
        const deck = dId ? p.decks.find((d) => d.id === dId) : undefined;
        return {
          profileId: p.id,
          name: p.name,
          screenName: p.screenName,
          deckId: dId,
          deckName: deck?.name,
          commander: deck?.commander ?? undefined,
          artCropUrl: deck?.artCropUrl ?? null,
        };
      });
  }

  const sizeOk = selectedIds.length >= MIN_POD_SIZE && selectedIds.length <= MAX_POD_SIZE;
  const allHaveDecks = selectedIds.every((id) => Boolean(deckChoice[id]));
  const canStart = sizeOk && allHaveDecks;

  if (showSeats) {
    return (
      <SeatAssignScreen
        selections={buildSelections()}
        onBack={() => setShowSeats(false)}
        onStart={onStart}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
          ← Back
        </button>
        <h1 className="text-base font-bold text-white">New Game</h1>
        <span className="w-12" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-3 text-center text-sm text-neutral-400">
          Pick {MIN_POD_SIZE}–{MAX_POD_SIZE} players for this pod — everyone needs a deck to start
        </p>

        {players.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-neutral-500">
              No players yet — add everyone in your group first.
            </p>
            <button
              onClick={onManagePlayers}
              className="rounded-xl bg-neutral-800 px-4 py-3 text-sm font-semibold text-emerald-400 active:scale-95"
            >
              👥 Players &amp; Decks
            </button>
          </div>
        ) : (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search players"
              className="mb-3 w-full rounded-xl bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-500"
            />

            {filteredPlayers.length === 0 && (
              <p className="mb-3 text-center text-sm text-neutral-500">
                No players match &quot;{search}&quot;.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {filteredPlayers.map((p) => (
                <PodPlayerRow
                  key={p.id}
                  player={p}
                  selected={selectedIds.includes(p.id)}
                  deckId={deckChoice[p.id] ?? null}
                  onToggleSelect={() => toggleSelect(p.id)}
                  onSelectDeck={(deckId) => setDeckChoice((prev) => ({ ...prev, [p.id]: deckId }))}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {players.length > 0 && (
        <div className="border-t border-neutral-800 px-4 py-4">
          <button
            disabled={!canStart}
            onClick={() => setShowSeats(true)}
            className="w-full rounded-2xl bg-emerald-500 px-8 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-30 disabled:shadow-none"
          >
            {selectedIds.length === 0
              ? "Select players to start"
              : selectedIds.length < MIN_POD_SIZE
              ? `Pick at least ${MIN_POD_SIZE} players`
              : !sizeOk
              ? `Max ${MAX_POD_SIZE} players`
              : !allHaveDecks
              ? "Pick a deck for everyone"
              : `Next: Choose Seats (${selectedIds.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
