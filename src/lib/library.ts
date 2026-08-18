import { useEffect, useState } from "react";

export type Deck = {
  id: string;
  name: string;
  commander?: string;
  colors?: string;
};

export type PlayerProfile = {
  id: string;
  name: string;
  decks: Deck[];
};

const STORAGE_KEY = "cmdr-tracker:players";

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newPlayerProfile(name: string): PlayerProfile {
  return { id: makeId("player"), name, decks: [] };
}

export function newDeck(name: string, commander: string, colors: string): Deck {
  return {
    id: makeId("deck"),
    name,
    commander: commander || undefined,
    colors: colors || undefined,
  };
}

function loadPlayers(): PlayerProfile[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function savePlayers(players: PlayerProfile[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch {
    // storage unavailable (private browsing, quota) — fail silently
  }
}

export function usePlayerLibrary() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage: server has no access to it, so
    // state must start empty and sync in after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayers(loadPlayers());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) savePlayers(players);
  }, [players, loaded]);

  return { players, setPlayers, loaded };
}
