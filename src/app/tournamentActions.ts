"use server";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  decks,
  gameParticipants,
  games,
  players,
  tournamentPodParticipants,
  tournamentPods,
  tournaments,
} from "@/db/schema";
import type { PlayerProfile } from "@/lib/library";
import { derivePodStatus, generatePods, type LivePodSnapshot, type PodStatus } from "@/lib/tournament";

// Accepts either the top-level db handle or a transaction handle passed
// into db.transaction(async (tx) => ...) — both expose the same
// insert/select/update/delete builder surface this file relies on.
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TournamentPodView = {
  id: string;
  round: number;
  podIndex: number;
  isOrganizerPod: boolean;
  isAutoAdvance: boolean;
  status: PodStatus;
  participants: { playerId: string; name: string; screenName: string | null }[];
  winnerPlayerId: string | null;
};

export type TournamentStateView = {
  id: string;
  organizerPlayerId: string;
  podSize: number;
  currentRound: number;
  status: "in_progress" | "complete";
  winnerPlayerId: string | null;
  pods: TournamentPodView[];
  // True only while every pod in the round is still exactly as generated —
  // nothing shared, nothing started. Reshuffling once a link has gone out
  // or a game has begun would orphan whoever's mid-setup or mid-game.
  canReshuffleRound: boolean;
};

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function buildPodViews(podRows: (typeof tournamentPods.$inferSelect)[]): Promise<TournamentPodView[]> {
  if (podRows.length === 0) return [];
  const podIds = podRows.map((p) => p.id);
  const [participantRows, allPlayers] = await Promise.all([
    db.select().from(tournamentPodParticipants).where(inArray(tournamentPodParticipants.podId, podIds)),
    db.select().from(players),
  ]);
  const playerById = new Map(allPlayers.map((p) => [p.id, p]));
  const participantsByPod = new Map<string, TournamentPodView["participants"]>();
  for (const row of participantRows.sort((a, b) => a.seatOrder - b.seatOrder)) {
    const player = playerById.get(row.playerId);
    if (!player) continue;
    const list = participantsByPod.get(row.podId) ?? [];
    list.push({ playerId: player.id, name: player.name, screenName: player.screenName });
    participantsByPod.set(row.podId, list);
  }

  return podRows
    .sort((a, b) => a.podIndex - b.podIndex)
    .map((pod) => ({
      id: pod.id,
      round: pod.round,
      podIndex: pod.podIndex,
      isOrganizerPod: pod.isOrganizerPod,
      isAutoAdvance: pod.isAutoAdvance,
      status: derivePodStatus(pod, pod.isOrganizerPod),
      participants: participantsByPod.get(pod.id) ?? [],
      winnerPlayerId: pod.winnerPlayerId,
    }));
}

async function insertRoundPods(
  dbClient: DbClient,
  tournamentId: string,
  round: number,
  organizerPlayerId: string,
  podPlayerIds: string[][],
  autoAdvancePlayerId: string | null
): Promise<void> {
  let podIndex = 0;
  for (const podPlayers of podPlayerIds) {
    const isOrganizerPod = podPlayers.includes(organizerPlayerId);
    const [pod] = await dbClient
      .insert(tournamentPods)
      .values({ tournamentId, round, podIndex: podIndex++, isOrganizerPod })
      .returning();
    await dbClient.insert(tournamentPodParticipants).values(
      podPlayers.map((playerId, seatOrder) => ({ podId: pod.id, playerId, seatOrder }))
    );
  }
  if (autoAdvancePlayerId) {
    const [pod] = await dbClient
      .insert(tournamentPods)
      .values({
        tournamentId,
        round,
        podIndex: podIndex++,
        isOrganizerPod: autoAdvancePlayerId === organizerPlayerId,
        isAutoAdvance: true,
        startedAt: new Date(),
        completedAt: new Date(),
        winnerPlayerId: autoAdvancePlayerId,
      })
      .returning();
    await dbClient
      .insert(tournamentPodParticipants)
      .values([{ podId: pod.id, playerId: autoAdvancePlayerId, seatOrder: 0 }]);
  }
}

export async function createTournament(
  organizerPlayerId: string,
  rosterPlayerIds: string[],
  podSize: number
): Promise<TournamentStateView> {
  const [tournament] = await db
    .insert(tournaments)
    .values({ organizerPlayerId, podSize })
    .returning();

  const { pods, autoAdvance } = generatePods(shuffled(rosterPlayerIds), podSize);
  await insertRoundPods(db, tournament.id, 1, organizerPlayerId, pods, autoAdvance);

  return getTournamentState(tournament.id);
}

// Guarded against a concurrent double-advance: the UPDATE that bumps
// currentRound (or marks the tournament complete) is scoped to the round
// it read, so a second caller racing in loses the WHERE match and safely
// no-ops instead of generating the round twice.
async function maybeAdvanceRound(tournamentId: string): Promise<void> {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
  if (!t || t.status === "complete") return;

  const currentPods = await db
    .select()
    .from(tournamentPods)
    .where(and(eq(tournamentPods.tournamentId, tournamentId), eq(tournamentPods.round, t.currentRound)))
    .orderBy(asc(tournamentPods.podIndex));
  if (currentPods.length === 0 || currentPods.some((p) => !p.completedAt)) return;

  const winners = currentPods.map((p) => p.winnerPlayerId!);

  if (winners.length === 1) {
    await db
      .update(tournaments)
      .set({ status: "complete", winnerPlayerId: winners[0] })
      .where(
        and(
          eq(tournaments.id, tournamentId),
          eq(tournaments.currentRound, t.currentRound),
          eq(tournaments.status, "in_progress")
        )
      );
    return;
  }

  const nextRound = t.currentRound + 1;
  const updated = await db
    .update(tournaments)
    .set({ currentRound: nextRound })
    .where(and(eq(tournaments.id, tournamentId), eq(tournaments.currentRound, t.currentRound)))
    .returning({ id: tournaments.id });
  if (updated.length === 0) return;

  const { pods, autoAdvance } = generatePods(winners, t.podSize);
  await insertRoundPods(db, tournamentId, nextRound, t.organizerPlayerId, pods, autoAdvance);
}

export async function getTournamentState(tournamentId: string): Promise<TournamentStateView> {
  await maybeAdvanceRound(tournamentId);

  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
  if (!t) throw new Error("Tournament not found.");

  const podRows = await db
    .select()
    .from(tournamentPods)
    .where(and(eq(tournamentPods.tournamentId, tournamentId), eq(tournamentPods.round, t.currentRound)));

  return {
    id: t.id,
    organizerPlayerId: t.organizerPlayerId,
    podSize: t.podSize,
    currentRound: t.currentRound,
    status: t.status as "in_progress" | "complete",
    winnerPlayerId: t.winnerPlayerId,
    pods: await buildPodViews(podRows),
    canReshuffleRound: podRows.every((p) => p.isAutoAdvance || (!p.sharedAt && !p.startedAt)),
  };
}

// Loads the current round's pod rows and the exact set of player ids in
// it, after confirming nothing has been shared or started yet — the
// shared precondition for both reshuffleRound and reassignRound, since
// re-pairing after that point would orphan whoever's mid-setup or
// mid-game.
async function loadUnstartedRoundPool(
  tournamentId: string
): Promise<{ tournament: typeof tournaments.$inferSelect; podIds: string[]; playerIds: string[] }> {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
  if (!t) throw new Error("Tournament not found.");

  const podRows = await db
    .select()
    .from(tournamentPods)
    .where(and(eq(tournamentPods.tournamentId, tournamentId), eq(tournamentPods.round, t.currentRound)));
  if (podRows.some((p) => !p.isAutoAdvance && (p.sharedAt || p.startedAt))) {
    throw new Error("Can't change pairings — this round has already started.");
  }

  const podIds = podRows.map((p) => p.id);
  const participantRows =
    podIds.length > 0
      ? await db.select().from(tournamentPodParticipants).where(inArray(tournamentPodParticipants.podId, podIds))
      : [];
  return { tournament: t, podIds, playerIds: participantRows.map((r) => r.playerId) };
}

async function applyRoundPairing(
  tournamentId: string,
  round: number,
  organizerPlayerId: string,
  podIdsToReplace: string[],
  pods: string[][],
  autoAdvance: string | null
): Promise<TournamentStateView> {
  await db.transaction(async (tx) => {
    if (podIdsToReplace.length > 0) {
      await tx.delete(tournamentPods).where(inArray(tournamentPods.id, podIdsToReplace));
    }
    await insertRoundPods(tx, tournamentId, round, organizerPlayerId, pods, autoAdvance);
  });
  return getTournamentState(tournamentId);
}

// Re-rolls which players landed in which pod for the current round.
// Deletes and regenerates rather than shuffling in place so it reuses the
// exact same generatePods/insertRoundPods path as every other round —
// one source of truth for pod-size shrinking and the auto-advance rule.
export async function reshuffleRound(tournamentId: string): Promise<TournamentStateView> {
  const { tournament: t, podIds, playerIds } = await loadUnstartedRoundPool(tournamentId);
  const { pods, autoAdvance } = generatePods(shuffled(playerIds), t.podSize);
  return applyRoundPairing(tournamentId, t.currentRound, t.organizerPlayerId, podIds, pods, autoAdvance);
}

// Applies an organizer-chosen grouping instead of a random shuffle.
// `pods` must partition the round's exact player pool into groups of
// 2..podSize, with at most one player left over (passed as
// `autoAdvance`) — the same invariant generatePods enforces, just
// chosen by hand instead of algorithmically.
export async function reassignRound(
  tournamentId: string,
  pods: string[][],
  autoAdvance: string | null
): Promise<TournamentStateView> {
  const { tournament: t, podIds, playerIds } = await loadUnstartedRoundPool(tournamentId);

  const assigned = pods.flat();
  const allAssigned = autoAdvance ? [...assigned, autoAdvance] : assigned;
  const expected = [...playerIds].sort();
  const got = [...allAssigned].sort();
  if (expected.length !== got.length || expected.some((id, i) => id !== got[i])) {
    throw new Error("Pairing doesn't match this round's players.");
  }
  if (pods.some((p) => p.length < 2 || p.length > t.podSize)) {
    throw new Error(`Every pod must have 2–${t.podSize} players.`);
  }

  return applyRoundPairing(tournamentId, t.currentRound, t.organizerPlayerId, podIds, pods, autoAdvance);
}

export async function getPodByToken(
  podId: string
): Promise<{ pod: TournamentPodView; tournamentId: string; organizerPlayerId: string } | null> {
  const [pod] = await db.select().from(tournamentPods).where(eq(tournamentPods.id, podId));
  if (!pod) return null;
  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, pod.tournamentId));
  if (!t) return null;
  const [view] = await buildPodViews([pod]);
  return { pod: view, tournamentId: t.id, organizerPlayerId: t.organizerPlayerId };
}

export async function getPodPlayers(podId: string): Promise<PlayerProfile[]> {
  const participantRows = await db
    .select()
    .from(tournamentPodParticipants)
    .where(eq(tournamentPodParticipants.podId, podId))
    .orderBy(asc(tournamentPodParticipants.seatOrder));
  const playerIds = participantRows.map((r) => r.playerId);
  if (playerIds.length === 0) return [];

  const [podPlayers, allDecks, allParticipants, allGames] = await Promise.all([
    db.select().from(players).where(inArray(players.id, playerIds)),
    db.select().from(decks).where(inArray(decks.playerId, playerIds)),
    db.select().from(gameParticipants),
    db.select().from(games),
  ]);

  const deckGamesPlayed = new Map<string, number>();
  const deckWins = new Map<string, number>();
  for (const gp of allParticipants) {
    if (!gp.deckId) continue;
    deckGamesPlayed.set(gp.deckId, (deckGamesPlayed.get(gp.deckId) ?? 0) + 1);
  }
  for (const g of allGames) {
    if (!g.winnerDeckId) continue;
    deckWins.set(g.winnerDeckId, (deckWins.get(g.winnerDeckId) ?? 0) + 1);
  }

  const decksByPlayer = new Map<string, PlayerProfile["decks"]>();
  for (const d of allDecks) {
    const list = decksByPlayer.get(d.playerId) ?? [];
    list.push({ ...d, gamesPlayed: deckGamesPlayed.get(d.id) ?? 0, wins: deckWins.get(d.id) ?? 0 });
    decksByPlayer.set(d.playerId, list);
  }

  const gamesPlayedByPlayer = new Map<string, number>();
  for (const gp of allParticipants) {
    gamesPlayedByPlayer.set(gp.playerId, (gamesPlayedByPlayer.get(gp.playerId) ?? 0) + 1);
  }

  const byId = new Map(podPlayers.map((p) => [p.id, p]));
  return playerIds
    .map((id) => byId.get(id))
    .filter((p): p is typeof podPlayers[number] => Boolean(p))
    .map((p) => ({
      ...p,
      decks: decksByPlayer.get(p.id) ?? [],
      gamesPlayed: gamesPlayedByPlayer.get(p.id) ?? 0,
    }));
}

export async function markPodShared(podId: string): Promise<void> {
  await db
    .update(tournamentPods)
    .set({ sharedAt: new Date() })
    .where(and(eq(tournamentPods.id, podId), isNull(tournamentPods.sharedAt)));
}

export async function markPodStarted(podId: string): Promise<void> {
  await db
    .update(tournamentPods)
    .set({ startedAt: new Date() })
    .where(and(eq(tournamentPods.id, podId), isNull(tournamentPods.startedAt)));
}

export async function reportPodResult(
  podId: string,
  gameId: string,
  winnerPlayerId: string
): Promise<void> {
  await db
    .update(tournamentPods)
    .set({ gameId, winnerPlayerId, completedAt: new Date() })
    .where(and(eq(tournamentPods.id, podId), isNull(tournamentPods.completedAt)));
}

export async function pushPodLiveSnapshot(podId: string, snapshot: LivePodSnapshot): Promise<void> {
  await db
    .update(tournamentPods)
    .set({ liveSnapshot: snapshot, liveSnapshotUpdatedAt: new Date() })
    .where(and(eq(tournamentPods.id, podId), isNull(tournamentPods.completedAt)));
}

export type TournamentLivePodView = {
  id: string;
  participants: { playerId: string; name: string }[];
  status: PodStatus;
  isAutoAdvance: boolean;
  winnerPlayerId: string | null;
  snapshot: LivePodSnapshot | null;
};

export async function getTournamentLiveState(
  tournamentId: string
): Promise<{ round: number; pods: TournamentLivePodView[] } | null> {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
  if (!t) return null;

  const podRows = await db
    .select()
    .from(tournamentPods)
    .where(and(eq(tournamentPods.tournamentId, tournamentId), eq(tournamentPods.round, t.currentRound)))
    .orderBy(asc(tournamentPods.podIndex));
  const views = await buildPodViews(podRows);
  const snapshotByPod = new Map(podRows.map((p) => [p.id, (p.liveSnapshot as LivePodSnapshot | null) ?? null]));

  return {
    round: t.currentRound,
    pods: views.map((v) => ({
      id: v.id,
      participants: v.participants.map((p) => ({ playerId: p.playerId, name: p.name })),
      status: v.status,
      isAutoAdvance: v.isAutoAdvance,
      winnerPlayerId: v.winnerPlayerId,
      snapshot: snapshotByPod.get(v.id) ?? null,
    })),
  };
}
