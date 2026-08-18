"use client";

import { useState } from "react";
import type { Deck, PlayerProfile } from "@/lib/library";
import DeckForm from "@/components/DeckForm";
import ColorPips from "@/components/ColorPips";

export default function PlayerRow({
  player,
  onRename,
  onDelete,
  onAddDeck,
  onEditDeck,
  onRemoveDeck,
}: {
  player: PlayerProfile;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddDeck: (name: string, commander: string, colors: string) => void;
  onEditDeck: (deckId: string, name: string, commander: string, colors: string) => void;
  onRemoveDeck: (deckId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(player.name);
  const [addingDeck, setAddingDeck] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
      <div className="flex items-center gap-3 p-3">
        {renaming ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              onRename(draftName.trim() || player.name);
              setRenaming(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="min-w-0 flex-1 rounded-lg bg-neutral-800 px-2 py-1 text-base font-semibold text-white outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraftName(player.name);
              setRenaming(true);
            }}
            className="min-w-0 flex-1 truncate text-left text-base font-semibold text-neutral-100"
          >
            {player.name}
          </button>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-400"
        >
          Decks ({player.decks.length}) {expanded ? "▾" : "▸"}
        </button>

        <button
          onClick={onDelete}
          aria-label="Delete player"
          className="shrink-0 rounded-full px-2 py-1.5 text-sm text-red-400/70"
        >
          🗑
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-neutral-800 p-3">
          {player.decks.map((deck) =>
            editingDeckId === deck.id ? (
              <DeckForm
                key={deck.id}
                initial={deck}
                onCancel={() => setEditingDeckId(null)}
                onSave={(name, commander, colors) => {
                  onEditDeck(deck.id, name, commander, colors);
                  setEditingDeckId(null);
                }}
              />
            ) : (
              <DeckRow
                key={deck.id}
                deck={deck}
                onEdit={() => setEditingDeckId(deck.id)}
                onRemove={() => onRemoveDeck(deck.id)}
              />
            )
          )}

          {addingDeck ? (
            <DeckForm
              onCancel={() => setAddingDeck(false)}
              onSave={(name, commander, colors) => {
                onAddDeck(name, commander, colors);
                setAddingDeck(false);
              }}
            />
          ) : (
            <button
              onClick={() => setAddingDeck(true)}
              className="rounded-xl border border-dashed border-neutral-700 py-2 text-sm font-semibold text-neutral-400 active:scale-95"
            >
              + Add Deck
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DeckRow({
  deck,
  onEdit,
  onRemove,
}: {
  deck: Deck;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-neutral-800/40 px-3 py-2">
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2 truncate text-sm font-semibold text-neutral-100">
          {deck.name}
          <ColorPips colors={deck.colors} />
        </span>
        {deck.commander && (
          <span className="block truncate text-xs text-neutral-400">{deck.commander}</span>
        )}
      </button>
      <button onClick={onRemove} className="shrink-0 px-2 text-sm text-red-400/70">
        🗑
      </button>
    </div>
  );
}
