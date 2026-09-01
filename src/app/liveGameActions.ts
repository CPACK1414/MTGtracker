"use server";

import { eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { activeGames } from "@/db/schema";
import type { LivePodSnapshot } from "@/lib/tournament";

// Rows older than this are treated as dead regardless of whether their
// game ever explicitly cleaned up after itself (crash, refresh that lost
// the session id, force-closed tab) — a self-healing staleness filter
// instead of relying on cleanup always running. Comfortably longer than
// the ~20s push interval so one missed tick doesn't flicker a live game
// out of the list.
const STALE_AFTER_MS = 90_000;

export type LiveGameView = { id: string; snapshot: LivePodSnapshot };

export async function pushActiveGameSnapshot(id: string, snapshot: LivePodSnapshot): Promise<void> {
  await db
    .insert(activeGames)
    .values({ id, liveSnapshot: snapshot, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: activeGames.id,
      set: { liveSnapshot: snapshot, updatedAt: new Date() },
    });
}

export async function endActiveGame(id: string): Promise<void> {
  await db.delete(activeGames).where(eq(activeGames.id, id));
}

export async function getLiveGames(): Promise<LiveGameView[]> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const rows = await db
    .select()
    .from(activeGames)
    .where(gt(activeGames.updatedAt, cutoff))
    .orderBy(activeGames.createdAt);
  return rows.map((r) => ({ id: r.id, snapshot: r.liveSnapshot as LivePodSnapshot }));
}
