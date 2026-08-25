"use client";

import type { PlayerProfile } from "@/lib/library";

export default function PodPlayerRow({
  player,
  selected,
  onToggleSelect,
}: {
  player: PlayerProfile;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <button
      onClick={onToggleSelect}
      className="flex w-full items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-3 text-left"
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
  );
}
