"use client";

import { useState, useTransition } from "react";
import type { PlayerProfile } from "@/lib/library";
import PlayerRow from "@/components/PlayerRow";
import {
  createDeck,
  createPlayer,
  deleteDeck,
  deletePlayer,
  renamePlayer,
  updateDeck,
} from "@/app/actions";

export default function PlayerLibraryScreen({
  players,
  onChangePlayers,
  onBack,
}: {
  players: PlayerProfile[];
  onChangePlayers: (updater: (prev: PlayerProfile[]) => PlayerProfile[]) => void;
  onBack: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  async function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    const created = await createPlayer(name);
    onChangePlayers((prev) => [...prev, created]);
  }

  async function removePlayer(id: string) {
    try {
      await deletePlayer(id);
      onChangePlayers((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete player.");
    }
  }

  function handleRename(id: string, name: string, screenName: string | null) {
    onChangePlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name, screenName } : p)));
    startTransition(() => {
      renamePlayer(id, name, screenName);
    });
  }

  async function addDeck(playerId: string, name: string, commander: string, colors: string) {
    const deck = await createDeck(playerId, name, commander, colors);
    onChangePlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, decks: [...p.decks, deck] } : p))
    );
  }

  function editDeck(
    playerId: string,
    deckId: string,
    name: string,
    commander: string,
    colors: string
  ) {
    onChangePlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? {
              ...p,
              decks: p.decks.map((d) =>
                d.id === deckId
                  ? { ...d, name, commander: commander || null, colors: colors || null }
                  : d
              ),
            }
          : p
      )
    );
    startTransition(() => {
      updateDeck(deckId, name, commander, colors);
    });
  }

  async function removeDeck(playerId: string, deckId: string) {
    try {
      await deleteDeck(deckId);
      onChangePlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, decks: p.decks.filter((d) => d.id !== deckId) } : p
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete deck.");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
          ← Back
        </button>
        <h1 className="text-base font-bold text-white">Players &amp; Decks</h1>
        <span className="w-12" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-red-950 px-3 py-2 text-sm text-red-300">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 font-bold">
              ✕
            </button>
          </div>
        )}

        {players.length === 0 && (
          <p className="mb-3 text-center text-sm text-neutral-500">
            No players yet — add everyone in your group below.
          </p>
        )}

        {players.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search players"
            className="mb-3 w-full rounded-xl bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-500"
          />
        )}

        {players.length > 0 && filteredPlayers.length === 0 && (
          <p className="mb-3 text-center text-sm text-neutral-500">
            No players match &quot;{search}&quot;.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {filteredPlayers.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              onRename={(name, screenName) => handleRename(p.id, name, screenName)}
              onDelete={() => removePlayer(p.id)}
              onAddDeck={(name, commander, colors) => addDeck(p.id, name, commander, colors)}
              onEditDeck={(deckId, name, commander, colors) =>
                editDeck(p.id, deckId, name, commander, colors)
              }
              onRemoveDeck={(deckId) => removeDeck(p.id, deckId)}
            />
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            placeholder="New player name"
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-500"
          />
          <button
            onClick={addPlayer}
            disabled={!newName.trim()}
            className="shrink-0 rounded-xl bg-neutral-800 px-4 py-3 font-semibold text-emerald-400 active:scale-95 disabled:opacity-40"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}
