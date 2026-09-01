import type { Player } from "@/lib/types";
import type { Rotation } from "@/lib/layout";
import type { GameEventInput } from "@/app/actions";
import { formatHoursMinutes } from "@/lib/format";

const STORAGE_KEY = "mtg-tracker:active-game:v1";

export type GameSnapshot = {
  version: 1;
  // Identifies this game's row in the `active_games` table across a
  // refresh/continue — generated once when the game starts, not per
  // save, so "Live Games" keeps tracking the same row instead of
  // forking a new one every time the snapshot is persisted.
  activeGameSessionId: string;
  players: Player[];
  damage: Record<string, Record<string, number>>;
  poison: Record<string, number>;
  radiation: Record<string, number>;
  firstPlayerId: string | null;
  eliminationOrder: string[];
  rotations: Record<string, Rotation>;
  // Elapsed seconds since the game "started," as of the moment this
  // snapshot was written — used to reconstruct a gameStartedAt anchor on
  // restore so the timer resumes from here instead of jumping forward by
  // however long the tab was closed.
  elapsedSecondsAtSave: number;
  currentTurnPlayerId: string | null;
  turnStartedAtElapsed: number | null;
  hasPassedOnce: boolean;
  roundNumber: number;
  events: GameEventInput[];
};

export function saveGameSnapshot(snapshot: Omit<GameSnapshot, "version">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...snapshot }));
  } catch {
    // Ignore storage errors (private browsing, quota, etc.) — losing the
    // autosave isn't worse than not having it.
  }
}

export function loadGameSnapshot(): GameSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    return parsed as GameSnapshot;
  } catch {
    return null;
  }
}

export function clearGameSnapshot() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

export function summarizeGameSnapshot(snapshot: GameSnapshot): string {
  const names = snapshot.players.map((p) => p.name).join(", ");
  return `${names} — ${formatHoursMinutes(snapshot.elapsedSecondsAtSave)} in`;
}
