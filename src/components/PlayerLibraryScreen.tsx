"use client";

import { useState, useTransition } from "react";
import type { PlayerProfile } from "@/lib/library";
import { MAX_POD_SIZE, MIN_POD_SIZE, type PodSelection } from "@/lib/types";
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
  onStart,
}: {
  players: PlayerProfile[];
  onChangePlayers: (updater: (prev: PlayerProfile[]) => PlayerProfile[]) => void;
  onStart: (selections: PodSelection[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deckChoice, setDeckChoice] = useState<Record<string, string | null>>({});
  const [newName, setNewName] = useState("");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    const created = await createPlayer(name);
    onChangePlayers((prev) => [...prev, created]);
  }

  async function removePlayer(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    try {
      await deletePlayer(id);
      onChangePlayers((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete player.");
    }
  }

  function handleRename(id: string, name: string) {
    onChangePlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    startTransition(() => {
      renamePlayer(id, name);
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_POD_SIZE) return prev;
      return [...prev, id];
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
      setDeckChoice((prev) => (prev[playerId] === deckId ? { ...prev, [playerId]: null } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete deck.");
    }
  }

  function handleStart() {
    const selections: PodSelection[] = selectedIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => {
        const dId = deckChoice[p.id] ?? null;
        const deck = dId ? p.decks.find((d) => d.id === dId) : undefined;
        return {
          profileId: p.id,
          name: p.name,
          deckId: dId,
          deckName: deck?.name,
          commander: deck?.commander ?? undefined,
        };
      });
    onStart(selections);
  }

  const canStart = selectedIds.length >= MIN_POD_SIZE && selectedIds.length <= MAX_POD_SIZE;

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-6 pb-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Commander Life Tracker</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Pick 2–8 players for this pod, and a deck for each
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
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

        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              selected={selectedIds.includes(p.id)}
              deckId={deckChoice[p.id] ?? null}
              onToggleSelect={() => toggleSelect(p.id)}
              onSelectDeck={(deckId) => setDeckChoice((prev) => ({ ...prev, [p.id]: deckId }))}
              onRename={(name) => handleRename(p.id, name)}
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

      <div className="border-t border-neutral-800 px-4 py-4">
        <button
          disabled={!canStart}
          onClick={handleStart}
          className="w-full rounded-2xl bg-emerald-500 px-8 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-30 disabled:shadow-none"
        >
          {selectedIds.length === 0
            ? "Select players to start"
            : canStart
            ? `Start Game (${selectedIds.length})`
            : `Max ${MAX_POD_SIZE} players`}
        </button>
      </div>
    </div>
  );
}
