"use client";

import type { PlayerProfile } from "@/lib/library";

export default function PodPlayerRow({
  player,
  selected,
  deckId,
  onToggleSelect,
  onSelectDeck,
}: {
  player: PlayerProfile;
  selected: boolean;
  deckId: string | null;
  onToggleSelect: () => void;
  onSelectDeck: (deckId: string | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
      <button
        onClick={onToggleSelect}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
            selected ? "bg-emerald-500 text-white" : "bg-neutral-800 text-neutral-600"
          }`}
        >
          {selected ? "✓" : ""}
        </span>
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-neutral-100">
          {player.name}
          {player.screenName && (
            <span className="ml-1 font-normal text-neutral-500">({player.screenName})</span>
          )}
        </span>
        <span className="shrink-0 text-xs text-neutral-500">
          {player.decks.length} deck{player.decks.length === 1 ? "" : "s"}
        </span>
      </button>

      {selected && (
        <div className="px-3 pb-3">
          {player.decks.length === 0 ? (
            <p className="rounded-lg bg-red-950 px-3 py-2 text-xs text-red-300">
              No decks yet — add one for {player.name} in Players &amp; Decks first.
            </p>
          ) : (
            <select
              value={deckId ?? ""}
              onChange={(e) => onSelectDeck(e.target.value || null)}
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="" disabled>
                Choose a deck
              </option>
              {player.decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
