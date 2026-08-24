"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScreenName, setNewScreenName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  async function addPlayer() {
    const name = newName.trim();
    const email = newEmail.trim();
    if (!name || !email) return;
    const nameLower = name.toLowerCase();
    if (players.some((p) => p.name.toLowerCase() === nameLower)) {
      setError(`A player named "${name}" already exists.`);
      return;
    }
    try {
      const created = await createPlayer(name, newScreenName.trim() || null, email);
      setNewName("");
      setNewScreenName("");
      setNewEmail("");
      setAddingPlayer(false);
      setError(null);
      onChangePlayers((prev) => [...prev, created]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add player.");
    }
  }

  async function removePlayer(id: string) {
    try {
      await deletePlayer(id);
      onChangePlayers((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete player.");
    }
  }

  async function handleRename(
    id: string,
    name: string,
    screenName: string | null,
    email: string | null
  ): Promise<void> {
    await renamePlayer(id, name, screenName, email);
    onChangePlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, screenName, email } : p))
    );
  }

  async function addDeck(
    playerId: string,
    name: string,
    commander: string,
    colors: string,
    artCropUrl: string | null
  ) {
    const deck = await createDeck(playerId, name, commander, colors, artCropUrl);
    onChangePlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, decks: [...p.decks, deck] } : p))
    );
  }

  function editDeck(
    playerId: string,
    deckId: string,
    name: string,
    commander: string,
    colors: string,
    artCropUrl: string | null
  ) {
    onChangePlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? {
              ...p,
              decks: p.decks.map((d) =>
                d.id === deckId
                  ? {
                      ...d,
                      name,
                      commander: commander || null,
                      colors: colors || null,
                      artCropUrl: artCropUrl || null,
                    }
                  : d
              ),
            }
          : p
      )
    );
    startTransition(() => {
      updateDeck(deckId, name, commander, colors, artCropUrl);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
          ← Back
        </button>
        <h1 className="text-base font-bold text-white">Players &amp; Decks</h1>
        <span className="w-12" />
      </header>

      {error && (
        <div className="fixed inset-x-4 top-4 z-50 flex items-center justify-between gap-2 rounded-xl border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200 shadow-lg shadow-black/40">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 font-bold">
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
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
              onRename={(name, screenName, email) => handleRename(p.id, name, screenName, email)}
              onDelete={() => removePlayer(p.id)}
              onAddDeck={(name, commander, colors, artCropUrl) =>
                addDeck(p.id, name, commander, colors, artCropUrl)
              }
              onEditDeck={(deckId, name, commander, colors, artCropUrl) =>
                editDeck(p.id, deckId, name, commander, colors, artCropUrl)
              }
              onRemoveDeck={(deckId) => removeDeck(p.id, deckId)}
            />
          ))}
        </div>

        {addingPlayer ? (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Name"
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
            />
            <input
              value={newScreenName}
              onChange={(e) => setNewScreenName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Screen Name (shown in game)"
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Email (required for daily recaps)"
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAddingPlayer(false);
                  setNewName("");
                  setNewScreenName("");
                  setNewEmail("");
                }}
                className="flex-1 rounded-lg bg-neutral-700 py-2 text-sm font-semibold text-neutral-300 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={addPlayer}
                disabled={!newName.trim() || !newEmail.trim()}
                className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingPlayer(true)}
            className="mt-3 w-full rounded-xl bg-neutral-800 px-4 py-3 font-semibold text-emerald-400 active:scale-95"
          >
            + Add Player
          </button>
        )}
      </div>
    </div>
  );
}
