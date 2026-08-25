"use client";

import type { Deck } from "@/lib/library";
import ColorPips from "@/components/ColorPips";

export default function DeckPickerModal({
  decks,
  onPick,
  onAddNew,
  onClose,
}: {
  decks: Deck[];
  onPick: (deckId: string) => void;
  onAddNew: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/80 sm:items-center sm:justify-center">
      <div className="flex max-h-[75vh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-neutral-900 p-5 sm:w-full sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Choose a Deck</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-neutral-800 px-4 py-2 text-sm font-bold text-neutral-300 active:scale-95"
          >
            Cancel
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {decks.map((d) => (
            <button
              key={d.id}
              onClick={() => onPick(d.id)}
              className="flex items-center gap-2 rounded-xl bg-neutral-800/60 px-3 py-2.5 text-left active:scale-[0.99]"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{d.name}</span>
              <ColorPips colors={d.colors} />
            </button>
          ))}
          <button
            onClick={onAddNew}
            className="rounded-xl border border-dashed border-neutral-700 py-2.5 text-sm font-semibold text-neutral-400 active:scale-95"
          >
            + Add Deck
          </button>
        </div>
      </div>
    </div>
  );
}
