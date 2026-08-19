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
  onRename: (name: string, screenName: string | null) => Promise<void>;
  onDelete: () => void;
  onAddDeck: (name: string, commander: string, colors: string, artCropUrl: string | null) => void;
  onEditDeck: (
    deckId: string,
    name: string,
    commander: string,
    colors: string,
    artCropUrl: string | null
  ) => void;
  onRemoveDeck: (deckId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(player.name);
  const [draftScreenName, setDraftScreenName] = useState(player.screenName ?? "");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingDeck, setAddingDeck] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

  function startRenaming() {
    setDraftName(player.name);
    setDraftScreenName(player.screenName ?? "");
    setRenameError(null);
    setRenaming(true);
  }

  async function saveRenaming() {
    setSaving(true);
    setRenameError(null);
    try {
      await onRename(draftName.trim() || player.name, draftScreenName.trim() || null);
      setRenaming(false);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
      {renaming ? (
        <div className="flex flex-col gap-2 p-3">
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
          />
          <input
            value={draftScreenName}
            onChange={(e) => setDraftScreenName(e.target.value)}
            placeholder="Screen Name (shown in game)"
            className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
          />
          {renameError && <p className="text-xs text-red-400">{renameError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setRenaming(false)}
              className="flex-1 rounded-lg bg-neutral-700 py-2 text-sm font-semibold text-neutral-300 active:scale-95"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={saveRenaming}
              className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={startRenaming}
            className="min-w-0 flex-1 truncate text-left text-base font-semibold text-neutral-100"
          >
            {player.name}
            {player.screenName && (
              <span className="ml-1 font-normal text-neutral-500">({player.screenName})</span>
            )}
          </button>

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
      )}

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-neutral-800 p-3">
          {player.decks.map((deck) =>
            editingDeckId === deck.id ? (
              <DeckForm
                key={deck.id}
                initial={deck}
                onCancel={() => setEditingDeckId(null)}
                onSave={(name, commander, colors, artCropUrl) => {
                  onEditDeck(deck.id, name, commander, colors, artCropUrl);
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
              onSave={(name, commander, colors, artCropUrl) => {
                onAddDeck(name, commander, colors, artCropUrl);
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
      </button>
      <button onClick={onRemove} className="shrink-0 px-2 text-sm text-red-400/70">
        🗑
      </button>
    </div>
  );
}
