"use client";

import { useState } from "react";
import type { PlayerProfile } from "@/lib/library";
import DeckForm from "@/components/DeckForm";
import DeckPickerModal from "@/components/DeckPickerModal";
import ColorPips from "@/components/ColorPips";

export default function PodPlayerRow({
  player,
  selected,
  deckId,
  onToggleSelect,
  onSelectDeck,
  onAddDeck,
}: {
  player: PlayerProfile;
  selected: boolean;
  deckId: string | null;
  onToggleSelect: () => void;
  onSelectDeck: (deckId: string | null) => void;
  onAddDeck: (
    name: string,
    commander: string,
    colors: string,
    artCropUrl: string | null
  ) => Promise<void>;
}) {
  const [addingDeck, setAddingDeck] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const selectedDeck = player.decks.find((d) => d.id === deckId) ?? null;

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
        <div className="flex flex-col gap-2 px-3 pb-3">
          {addingDeck ? (
            <DeckForm
              onCancel={() => setAddingDeck(false)}
              onSave={(name, commander, colors, artCropUrl) => {
                onAddDeck(name, commander, colors, artCropUrl).then(() => setAddingDeck(false));
              }}
            />
          ) : (
            <>
              <button
                onClick={() => setShowPicker(true)}
                className="flex w-full items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-left text-sm outline-none"
              >
                {selectedDeck ? (
                  <>
                    <span className="min-w-0 flex-1 truncate font-semibold text-white">
                      {selectedDeck.name}
                    </span>
                    <ColorPips colors={selectedDeck.colors} />
                  </>
                ) : (
                  <span className="flex-1 text-neutral-500">Choose a deck</span>
                )}
                <span className="shrink-0 text-neutral-500">▾</span>
              </button>
              {showPicker && (
                <DeckPickerModal
                  decks={player.decks}
                  onPick={(id) => {
                    onSelectDeck(id);
                    setShowPicker(false);
                  }}
                  onAddNew={() => {
                    setShowPicker(false);
                    setAddingDeck(true);
                  }}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
