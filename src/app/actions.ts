"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { commanderDamage, decks, gameEvents, gameParticipants, games, players } from "@/db/schema";
import { STARTING_LIFE, type EliminationReason } from "@/lib/types";
import type { Deck, PlayerProfile } from "@/lib/library";

function pgErrorCode(e: unknown): string | undefined {
  if (!e || typeof e !== "object") return undefined;
  const code = (e as { code?: string }).code;
  if (code) return code;
  const cause = (e as { cause?: unknown }).cause;
  return pgErrorCode(cause);
}

function friendlyDbError(e: unknown, context: string): never {
  if (pgErrorCode(e) === "23503") {
    throw new Error(`Can't delete — this ${context} has game history attached.`);
  }
  throw e;
}

async function ensureUniqueNames(
  name: string,
  screenName: string | null,
  excludePlayerId?: string
): Promise<void> {
  const nameLower = name.trim().toLowerCase();
  const screenLower = screenName?.trim().toLowerCase();

  const allPlayers = await db.select().from(players);
  for (const p of allPlayers) {
    if (p.id === excludePlayerId) continue;
    if (p.name.trim().toLowerCase() === nameLower) {
      throw new Error(`A player named "${name.trim()}" already exists.`);
    }
    if (screenLower && p.screenName && p.screenName.trim().toLowerCase() === screenLower) {
      throw new Error(`A player with the screen name "${screenName!.trim()}" already exists.`);
    }
  }
}

export async function getPlayersWithDecks(): Promise<PlayerProfile[]> {
  const [allPlayers, allDecks, allParticipants] = await Promise.all([
    db.select().from(players).orderBy(players.createdAt),
    db.select().from(decks).orderBy(decks.createdAt),
    db.select().from(gameParticipants),
  ]);

  const decksByPlayer = new Map<string, Deck[]>();
  for (const d of allDecks) {
    const list = decksByPlayer.get(d.playerId) ?? [];
    list.push(d);
    decksByPlayer.set(d.playerId, list);
  }

  const gamesPlayedByPlayer = new Map<string, number>();
  for (const gp of allParticipants) {
    gamesPlayedByPlayer.set(gp.playerId, (gamesPlayedByPlayer.get(gp.playerId) ?? 0) + 1);
  }

  return allPlayers.map((p) => ({
    ...p,
    decks: decksByPlayer.get(p.id) ?? [],
    gamesPlayed: gamesPlayedByPlayer.get(p.id) ?? 0,
  }));
}

export async function createPlayer(
  name: string,
  screenName?: string | null
): Promise<PlayerProfile> {
  await ensureUniqueNames(name, screenName ?? null);
  const [player] = await db
    .insert(players)
    .values({ name, screenName: screenName?.trim() || null })
    .returning();
  return { ...player, decks: [], gamesPlayed: 0 };
}

export async function renamePlayer(
  id: string,
  name: string,
  screenName: string | null
): Promise<void> {
  await ensureUniqueNames(name, screenName, id);
  await db.update(players).set({ name, screenName }).where(eq(players.id, id));
}

export async function deletePlayer(id: string): Promise<void> {
  try {
    await db.delete(players).where(eq(players.id, id));
  } catch (e) {
    friendlyDbError(e, "player");
  }
}

export async function createDeck(
  playerId: string,
  name: string,
  commander: string,
  colors: string,
  artCropUrl?: string | null
): Promise<Deck> {
  const [deck] = await db
    .insert(decks)
    .values({
      playerId,
      name,
      commander: commander || null,
      colors: colors || null,
      artCropUrl: artCropUrl || null,
    })
    .returning();
  return deck;
}

export async function updateDeck(
  deckId: string,
  name: string,
  commander: string,
  colors: string,
  artCropUrl?: string | null
): Promise<void> {
  await db
    .update(decks)
    .set({
      name,
      commander: commander || null,
      colors: colors || null,
      artCropUrl: artCropUrl || null,
    })
    .where(eq(decks.id, deckId));
}

export async function deleteDeck(deckId: string): Promise<void> {
  try {
    await db.delete(decks).where(eq(decks.id, deckId));
  } catch (e) {
    friendlyDbError(e, "deck");
  }
}

export type GameEventInput = {
  elapsedSeconds: number;
  type: "change" | "eliminated" | "revived" | "turnEnded";
  playerId: string;
  lifeDelta?: number;
  commanderDamageDelta?: number;
  poisonDelta?: number;
  radiationDelta?: number;
  eliminationReason?: EliminationReason | null;
  turnDurationSeconds?: number;
};

export type SaveGamePayload = {
  podSize: number;
  durationSeconds: number;
  winnerPlayerId: string | null;
  winnerDeckId: string | null;
  firstPlayerId: string | null;
  participants: {
    playerId: string;
    deckId: string | null;
    seatOrder: number;
    finalLife: number;
    placement: number;
    eliminationReason: EliminationReason | null;
  }[];
  damage: { fromPlayerId: string; toPlayerId: string; amount: number }[];
  events: GameEventInput[];
};

export async function saveGame(payload: SaveGamePayload): Promise<{ id: string }> {
  const game = await db.transaction(async (tx) => {
    const [game] = await tx
      .insert(games)
      .values({
        podSize: payload.podSize,
        durationSeconds: payload.durationSeconds,
        winnerPlayerId: payload.winnerPlayerId,
        winnerDeckId: payload.winnerDeckId,
        firstPlayerId: payload.firstPlayerId,
      })
      .returning();

    if (payload.participants.length > 0) {
      await tx.insert(gameParticipants).values(
        payload.participants.map((p) => ({
          gameId: game.id,
          playerId: p.playerId,
          deckId: p.deckId,
          seatOrder: p.seatOrder,
          startingLife: STARTING_LIFE,
          finalLife: p.finalLife,
          placement: p.placement,
          eliminationReason: p.eliminationReason,
        }))
      );
    }

    const damageRows = payload.damage.filter((d) => d.amount > 0);
    if (damageRows.length > 0) {
      await tx.insert(commanderDamage).values(
        damageRows.map((d) => ({
          gameId: game.id,
          dealtByPlayerId: d.fromPlayerId,
          dealtToPlayerId: d.toPlayerId,
          amount: d.amount,
        }))
      );
    }

    if (payload.events.length > 0) {
      await tx.insert(gameEvents).values(
        payload.events.map((e) => ({
          gameId: game.id,
          elapsedSeconds: e.elapsedSeconds,
          type: e.type,
          playerId: e.playerId,
          lifeDelta: e.lifeDelta ?? null,
          commanderDamageDelta: e.commanderDamageDelta ?? null,
          poisonDelta: e.poisonDelta ?? null,
          radiationDelta: e.radiationDelta ?? null,
          eliminationReason: e.eliminationReason ?? null,
          turnDurationSeconds: e.turnDurationSeconds ?? null,
        }))
      );
    }

    return game;
  });

  return { id: game.id };
}

export type PlayerStats = {
  id: string;
  name: string;
  screenName: string | null;
  gamesPlayed: number;
  wins: number;
  winRate: number;
};

export type DeckStats = {
  id: string;
  name: string;
  playerName: string;
  commander: string | null;
  gamesPlayed: number;
  wins: number;
  winRate: number;
};

export type DeckGroupMatchup = {
  key: string;
  decks: { id: string; name: string; playerName: string; wins: number }[];
  gamesPlayed: number;
};

export type PlayerGroupMatchup = {
  key: string;
  players: { id: string; name: string; screenName: string | null; wins: number }[];
  gamesPlayed: number;
};

export type FunStatEntry = { name: string; screenName: string | null };
export type FunStatRank = { rank: number; count: number; entries: FunStatEntry[] };
export type CommanderStatRank = { rank: number; count: number; commanders: string[] };
export type EliminationReasonRank = { rank: number; count: number; reasons: string[] };
export type PlacementStat = { count: number; entries: FunStatEntry[] };
export type FunStats = {
  mostScoops: FunStatRank[];
  mostLosses: FunStatRank[];
  mostPlayedCommander: CommanderStatRank[];
  mostGamesPlayed: FunStatRank[];
  eliminationReasons: EliminationReasonRank[];
  runnerUp: { secondPlace: PlacementStat; thirdPlace: PlacementStat; fourthPlace: PlacementStat };
  longestAvgGame: { name: string; screenName: string | null; avgDurationSeconds: number }[];
  firstPlayerWinRate: { wins: number; total: number; winRate: number } | null;
  biggestHit: {
    amount: number;
    hits: { type: "commanderDamage" | "combatDamage"; receiver: FunStatEntry }[];
  } | null;
  biggestTarget: FunStatRank[];
  totalDamage: { commanderDamage: number; combatDamage: number };
  longestTurnEver: { durationSeconds: number; entries: FunStatEntry[] } | null;
  longestTurnAvg: FunStatRank[];
  avgTurnsPerGame: number | null;
};

export type ReportingData = {
  players: PlayerStats[];
  decks: DeckStats[];
  deckMatchups: DeckGroupMatchup[];
  playerMatchups: PlayerGroupMatchup[];
  funStats: FunStats;
};

export type DateRange = { from: string; to: string };

export async function getReportingData(
  podSize?: number | null,
  dateRange?: DateRange | null
): Promise<ReportingData> {
  const [allPlayers, allDecks, allGamesRaw, allParticipantsRaw, allEventsRaw, allCommanderDamageRaw] =
    await Promise.all([
      db.select().from(players),
      db.select().from(decks),
      db.select().from(games),
      db.select().from(gameParticipants),
      db.select().from(gameEvents),
      db.select().from(commanderDamage),
    ]);

  let allGames = podSize ? allGamesRaw.filter((g) => g.podSize === podSize) : allGamesRaw;
  if (dateRange) {
    const from = new Date(dateRange.from).getTime();
    const to = new Date(dateRange.to).getTime();
    allGames = allGames.filter((g) => {
      const playedAt = g.playedAt.getTime();
      return playedAt >= from && playedAt <= to;
    });
  }
  const gameIds = new Set(allGames.map((g) => g.id));
  const allParticipants = allParticipantsRaw.filter((p) => gameIds.has(p.gameId));
  const allEvents = allEventsRaw.filter((e) => gameIds.has(e.gameId));
  const allCommanderDamage = allCommanderDamageRaw.filter((d) => gameIds.has(d.gameId));

  const decksById = new Map(allDecks.map((d) => [d.id, d]));
  const playersById = new Map(allPlayers.map((p) => [p.id, p]));

  const playerStats: PlayerStats[] = allPlayers
    .map((p) => {
      const played = allParticipants.filter((gp) => gp.playerId === p.id);
      const wins = allGames.filter((g) => g.winnerPlayerId === p.id).length;
      return {
        id: p.id,
        name: p.name,
        screenName: p.screenName,
        gamesPlayed: played.length,
        wins,
        winRate: played.length ? wins / played.length : 0,
      };
    })
    .filter((p) => p.gamesPlayed > 0)
    .sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed);

  const deckStats: DeckStats[] = allDecks
    .map((d) => {
      const played = allParticipants.filter((gp) => gp.deckId === d.id);
      const wins = allGames.filter((g) => g.winnerDeckId === d.id).length;
      return {
        id: d.id,
        name: d.name,
        playerName: playersById.get(d.playerId)?.name ?? "Unknown",
        commander: d.commander,
        gamesPlayed: played.length,
        wins,
        winRate: played.length ? wins / played.length : 0,
      };
    })
    .filter((d) => d.gamesPlayed > 0)
    .sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed);

  const deckGroupMap = new Map<string, DeckGroupMatchup>();
  for (const game of allGames) {
    const gp = allParticipants.filter((p) => p.gameId === game.id);
    const distinctDeckIds = Array.from(
      new Set(gp.map((p) => p.deckId).filter((x): x is string => Boolean(x)))
    ).sort();
    if (distinctDeckIds.length < 2) continue;
    const key = distinctDeckIds.join("|");
    let group = deckGroupMap.get(key);
    if (!group) {
      group = {
        key,
        decks: distinctDeckIds.map((id) => ({
          id,
          name: decksById.get(id)?.name ?? "Unknown deck",
          playerName: playersById.get(decksById.get(id)?.playerId ?? "")?.name ?? "",
          wins: 0,
        })),
        gamesPlayed: 0,
      };
      deckGroupMap.set(key, group);
    }
    group.gamesPlayed += 1;
    if (game.winnerDeckId) {
      const winner = group.decks.find((d) => d.id === game.winnerDeckId);
      if (winner) winner.wins += 1;
    }
  }

  const deckMatchups = Array.from(deckGroupMap.values()).sort(
    (a, b) => b.gamesPlayed - a.gamesPlayed
  );

  const groupMap = new Map<string, PlayerGroupMatchup>();
  for (const game of allGames) {
    const gp = allParticipants.filter((p) => p.gameId === game.id);
    const distinctPlayerIds = Array.from(
      new Set(gp.map((p) => p.playerId))
    ).sort();
    if (distinctPlayerIds.length < 2) continue;
    const key = distinctPlayerIds.join("|");
    let group = groupMap.get(key);
    if (!group) {
      group = {
        key,
        players: distinctPlayerIds.map((id) => ({
          id,
          name: playersById.get(id)?.name ?? "Unknown",
          screenName: playersById.get(id)?.screenName ?? null,
          wins: 0,
        })),
        gamesPlayed: 0,
      };
      groupMap.set(key, group);
    }
    group.gamesPlayed += 1;
    if (game.winnerPlayerId) {
      const winner = group.players.find((p) => p.id === game.winnerPlayerId);
      if (winner) winner.wins += 1;
    }
  }

  const playerMatchups = Array.from(groupMap.values()).sort(
    (a, b) => b.gamesPlayed - a.gamesPlayed
  );

  function topRanks(counts: Map<string, number>, topN: number): { rank: number; count: number; ids: string[] }[] {
    const distinctCounts = Array.from(new Set(counts.values()))
      .filter((c) => c > 0)
      .sort((a, b) => b - a)
      .slice(0, topN);
    return distinctCounts.map((count, i) => ({
      rank: i + 1,
      count,
      ids: Array.from(counts.entries())
        .filter(([, c]) => c === count)
        .map(([id]) => id),
    }));
  }

  function topPlayerRanks(counts: Map<string, number>, topN = 3): FunStatRank[] {
    return topRanks(counts, topN).map(({ rank, count, ids }) => ({
      rank,
      count,
      entries: ids.map((id) => {
        const p = playersById.get(id);
        return { name: p?.name ?? "Unknown", screenName: p?.screenName ?? null };
      }),
    }));
  }

  const scoopCounts = new Map<string, number>();
  const gamesPlayedCounts = new Map<string, number>();
  for (const gp of allParticipants) {
    gamesPlayedCounts.set(gp.playerId, (gamesPlayedCounts.get(gp.playerId) ?? 0) + 1);
    if (gp.eliminationReason === "scoop") {
      scoopCounts.set(gp.playerId, (scoopCounts.get(gp.playerId) ?? 0) + 1);
    }
  }

  const lossCounts = new Map<string, number>();
  for (const p of playerStats) {
    const losses = p.gamesPlayed - p.wins;
    if (losses > 0) lossCounts.set(p.id, losses);
  }

  const commanderCounts = new Map<string, number>();
  for (const gp of allParticipants) {
    const commander = gp.deckId ? decksById.get(gp.deckId)?.commander : null;
    if (!commander) continue;
    commanderCounts.set(commander, (commanderCounts.get(commander) ?? 0) + 1);
  }
  const mostPlayedCommander: CommanderStatRank[] = topRanks(commanderCounts, 3).map(
    ({ rank, count, ids }) => ({ rank, count, commanders: ids })
  );

  const durationByGame = new Map(
    allGames.filter((g) => g.durationSeconds != null).map((g) => [g.id, g.durationSeconds!])
  );
  const durationSumByPlayer = new Map<string, number>();
  const durationCountByPlayer = new Map<string, number>();
  for (const gp of allParticipants) {
    const duration = durationByGame.get(gp.gameId);
    if (duration == null) continue;
    durationSumByPlayer.set(gp.playerId, (durationSumByPlayer.get(gp.playerId) ?? 0) + duration);
    durationCountByPlayer.set(gp.playerId, (durationCountByPlayer.get(gp.playerId) ?? 0) + 1);
  }
  const avgByPlayer = new Map<string, number>();
  for (const [playerId, sum] of durationSumByPlayer) {
    const count = durationCountByPlayer.get(playerId) ?? 0;
    if (count === 0) continue;
    avgByPlayer.set(playerId, sum / count);
  }
  let maxAvg = -Infinity;
  for (const avg of avgByPlayer.values()) {
    if (avg > maxAvg) maxAvg = avg;
  }
  const longestAvgGame: { name: string; screenName: string | null; avgDurationSeconds: number }[] =
    avgByPlayer.size === 0
      ? []
      : Array.from(avgByPlayer.entries())
          .filter(([, avg]) => Math.abs(avg - maxAvg) < 0.001)
          .map(([playerId, avg]) => {
            const p = playersById.get(playerId);
            return {
              name: p?.name ?? "Unknown",
              screenName: p?.screenName ?? null,
              avgDurationSeconds: avg,
            };
          });

  const eliminationReasonLabels: Record<string, string> = {
    commanderDamage: "Commander Damage",
    combatDamage: "Combat Damage",
    scoop: "Scoop",
  };
  const eliminationReasonCounts = new Map<string, number>();
  for (const gp of allParticipants) {
    if (!gp.eliminationReason || !(gp.eliminationReason in eliminationReasonLabels)) continue;
    eliminationReasonCounts.set(
      gp.eliminationReason,
      (eliminationReasonCounts.get(gp.eliminationReason) ?? 0) + 1
    );
  }
  const eliminationReasons: EliminationReasonRank[] = topRanks(eliminationReasonCounts, 3).map(
    ({ rank, count, ids }) => ({
      rank,
      count,
      reasons: ids.map((id) => eliminationReasonLabels[id] ?? id),
    })
  );

  // "Podium, But Sad" and "Biggest Target" only make sense with 3+ players at
  // the table (in a 2-player game, 2nd place / eliminated-first is just "the
  // loser"), so both are scoped to 3+ player games regardless of the pod-size
  // filter selected above.
  const gameIds3Plus = new Set(allGames.filter((g) => g.podSize >= 3).map((g) => g.id));
  const participants3Plus = allParticipants.filter((p) => gameIds3Plus.has(p.gameId));

  function placementStat(placement: number): PlacementStat {
    const counts = new Map<string, number>();
    for (const gp of participants3Plus) {
      if (gp.placement !== placement) continue;
      counts.set(gp.playerId, (counts.get(gp.playerId) ?? 0) + 1);
    }
    const top = topRanks(counts, 1)[0];
    if (!top) return { count: 0, entries: [] };
    return {
      count: top.count,
      entries: top.ids.map((id) => {
        const p = playersById.get(id);
        return { name: p?.name ?? "Unknown", screenName: p?.screenName ?? null };
      }),
    };
  }

  const runnerUp = {
    secondPlace: placementStat(2),
    thirdPlace: placementStat(3),
    fourthPlace: placementStat(4),
  };

  const gamesWithFirstPlayer = allGames.filter((g) => g.firstPlayerId);
  const firstPlayerWins = gamesWithFirstPlayer.filter(
    (g) => g.winnerPlayerId && g.winnerPlayerId === g.firstPlayerId
  ).length;
  const firstPlayerWinRate =
    gamesWithFirstPlayer.length > 0
      ? {
          wins: firstPlayerWins,
          total: gamesWithFirstPlayer.length,
          winRate: firstPlayerWins / gamesWithFirstPlayer.length,
        }
      : null;

  const hitCandidates: { type: "commanderDamage" | "combatDamage"; amount: number; playerId: string }[] =
    [];
  for (const e of allEvents) {
    if (e.type !== "change") continue;
    if (e.commanderDamageDelta && e.commanderDamageDelta < 0) {
      hitCandidates.push({
        type: "commanderDamage",
        amount: -e.commanderDamageDelta,
        playerId: e.playerId,
      });
    }
    if (e.lifeDelta && e.lifeDelta < 0) {
      hitCandidates.push({ type: "combatDamage", amount: -e.lifeDelta, playerId: e.playerId });
    }
  }
  let maxHitAmount = 0;
  for (const c of hitCandidates) {
    if (c.amount > maxHitAmount) maxHitAmount = c.amount;
  }
  const biggestHit =
    maxHitAmount > 0
      ? {
          amount: maxHitAmount,
          hits: hitCandidates
            .filter((c) => c.amount === maxHitAmount)
            .map((c) => {
              const p = playersById.get(c.playerId);
              return {
                type: c.type,
                receiver: { name: p?.name ?? "Unknown", screenName: p?.screenName ?? null },
              };
            }),
        }
      : null;

  const eliminationEventsByGame = new Map<string, typeof allEvents>();
  for (const e of allEvents) {
    if (e.type !== "eliminated" || !gameIds3Plus.has(e.gameId)) continue;
    const list = eliminationEventsByGame.get(e.gameId) ?? [];
    list.push(e);
    eliminationEventsByGame.set(e.gameId, list);
  }
  const firstEliminatedCounts = new Map<string, number>();
  for (const events of eliminationEventsByGame.values()) {
    let earliest: (typeof events)[number] | null = null;
    for (const e of events) {
      if (!earliest || e.elapsedSeconds < earliest.elapsedSeconds) earliest = e;
    }
    if (earliest) {
      firstEliminatedCounts.set(earliest.playerId, (firstEliminatedCounts.get(earliest.playerId) ?? 0) + 1);
    }
  }
  const biggestTarget = topPlayerRanks(firstEliminatedCounts, 1);

  const totalCommanderDamage = allCommanderDamage.reduce((sum, d) => sum + d.amount, 0);
  const totalCombatDamage = allEvents.reduce(
    (sum, e) => sum + (e.type === "change" && e.lifeDelta && e.lifeDelta < 0 ? -e.lifeDelta : 0),
    0
  );
  const totalDamage = { commanderDamage: totalCommanderDamage, combatDamage: totalCombatDamage };

  const turnEndedEvents = allEvents.filter(
    (e) => e.type === "turnEnded" && e.turnDurationSeconds != null
  );

  let maxTurnDuration = 0;
  for (const e of turnEndedEvents) {
    if ((e.turnDurationSeconds ?? 0) > maxTurnDuration) maxTurnDuration = e.turnDurationSeconds ?? 0;
  }
  const longestTurnEver =
    maxTurnDuration > 0
      ? {
          durationSeconds: maxTurnDuration,
          entries: Array.from(
            new Set(
              turnEndedEvents
                .filter((e) => e.turnDurationSeconds === maxTurnDuration)
                .map((e) => e.playerId)
            )
          ).map((playerId) => {
            const p = playersById.get(playerId);
            return { name: p?.name ?? "Unknown", screenName: p?.screenName ?? null };
          }),
        }
      : null;

  const turnTotalsByPlayer = new Map<string, { total: number; count: number }>();
  for (const e of turnEndedEvents) {
    const stat = turnTotalsByPlayer.get(e.playerId) ?? { total: 0, count: 0 };
    stat.total += e.turnDurationSeconds ?? 0;
    stat.count += 1;
    turnTotalsByPlayer.set(e.playerId, stat);
  }
  const turnAvgByPlayer = new Map<string, number>();
  for (const [playerId, stat] of turnTotalsByPlayer) {
    turnAvgByPlayer.set(playerId, stat.total / stat.count);
  }
  const longestTurnAvg = topPlayerRanks(turnAvgByPlayer, 3);

  const turnCountsByGame = new Map<string, number>();
  for (const e of turnEndedEvents) {
    turnCountsByGame.set(e.gameId, (turnCountsByGame.get(e.gameId) ?? 0) + 1);
  }
  const gamesWithTurnData = Array.from(turnCountsByGame.values());
  const avgTurnsPerGame =
    gamesWithTurnData.length > 0
      ? gamesWithTurnData.reduce((sum, c) => sum + c, 0) / gamesWithTurnData.length
      : null;

  const funStats: FunStats = {
    mostScoops: topPlayerRanks(scoopCounts),
    mostLosses: topPlayerRanks(lossCounts),
    mostPlayedCommander,
    mostGamesPlayed: topPlayerRanks(gamesPlayedCounts),
    eliminationReasons,
    runnerUp,
    longestAvgGame,
    firstPlayerWinRate,
    biggestHit,
    biggestTarget,
    totalDamage,
    longestTurnEver,
    longestTurnAvg,
    avgTurnsPerGame,
  };

  return { players: playerStats, decks: deckStats, deckMatchups, playerMatchups, funStats };
}

export type PlayerGameHistoryEntry = {
  gameId: string;
  playedAt: string;
  durationSeconds: number | null;
  podSize: number;
  placement: number | null;
  won: boolean;
  eliminationReason: EliminationReason | null;
  deckName: string | null;
  commander: string | null;
};

export async function getPlayerGameHistory(playerId: string): Promise<PlayerGameHistoryEntry[]> {
  const rows = await db
    .select({
      gameId: gameParticipants.gameId,
      placement: gameParticipants.placement,
      deckId: gameParticipants.deckId,
      eliminationReason: gameParticipants.eliminationReason,
      playedAt: games.playedAt,
      durationSeconds: games.durationSeconds,
      podSize: games.podSize,
      winnerPlayerId: games.winnerPlayerId,
    })
    .from(gameParticipants)
    .innerJoin(games, eq(gameParticipants.gameId, games.id))
    .where(eq(gameParticipants.playerId, playerId))
    .orderBy(desc(games.playedAt));

  const deckIds = rows.map((r) => r.deckId).filter((x): x is string => Boolean(x));
  const deckRows = deckIds.length
    ? await db.select().from(decks).where(inArray(decks.id, deckIds))
    : [];
  const decksById = new Map(deckRows.map((d) => [d.id, d]));

  return rows.map((r) => {
    const deck = r.deckId ? decksById.get(r.deckId) : undefined;
    return {
      gameId: r.gameId,
      playedAt: r.playedAt.toISOString(),
      durationSeconds: r.durationSeconds,
      podSize: r.podSize,
      placement: r.placement,
      won: r.winnerPlayerId === playerId,
      eliminationReason: r.eliminationReason as EliminationReason | null,
      deckName: deck?.name ?? null,
      commander: deck?.commander ?? null,
    };
  });
}

export type GameDetailParticipant = {
  playerId: string;
  playerName: string;
  playerScreenName: string | null;
  deckName: string | null;
  commander: string | null;
  placement: number | null;
  finalLife: number | null;
  eliminationReason: EliminationReason | null;
  won: boolean;
  totalTurnSeconds: number;
  turnsPlayed: number;
};

export type GameDetail = {
  gameId: string;
  playedAt: string;
  podSize: number;
  durationSeconds: number | null;
  firstPlayerName: string | null;
  firstPlayerScreenName: string | null;
  participants: GameDetailParticipant[];
};

export async function getGameDetail(gameId: string): Promise<GameDetail | null> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) return null;

  const participantRows = await db
    .select()
    .from(gameParticipants)
    .where(eq(gameParticipants.gameId, gameId));

  const playerIds = participantRows.map((p) => p.playerId);
  const deckIds = participantRows.map((p) => p.deckId).filter((x): x is string => Boolean(x));

  const [playerRows, deckRows] = await Promise.all([
    playerIds.length ? db.select().from(players).where(inArray(players.id, playerIds)) : [],
    deckIds.length ? db.select().from(decks).where(inArray(decks.id, deckIds)) : [],
  ]);

  const playersById = new Map(playerRows.map((p) => [p.id, p]));
  const decksById = new Map(deckRows.map((d) => [d.id, d]));

  const turnEventRows = await db
    .select()
    .from(gameEvents)
    .where(and(eq(gameEvents.gameId, gameId), eq(gameEvents.type, "turnEnded")));
  const turnStatsByPlayer = new Map<string, { totalTurnSeconds: number; turnsPlayed: number }>();
  for (const e of turnEventRows) {
    const stat = turnStatsByPlayer.get(e.playerId) ?? { totalTurnSeconds: 0, turnsPlayed: 0 };
    stat.totalTurnSeconds += e.turnDurationSeconds ?? 0;
    stat.turnsPlayed += 1;
    turnStatsByPlayer.set(e.playerId, stat);
  }

  const participants: GameDetailParticipant[] = participantRows
    .map((p) => {
      const deck = p.deckId ? decksById.get(p.deckId) : undefined;
      const turnStat = turnStatsByPlayer.get(p.playerId);
      return {
        playerId: p.playerId,
        playerName: playersById.get(p.playerId)?.name ?? "Unknown",
        playerScreenName: playersById.get(p.playerId)?.screenName ?? null,
        deckName: deck?.name ?? null,
        commander: deck?.commander ?? null,
        placement: p.placement,
        finalLife: p.finalLife,
        eliminationReason: p.eliminationReason as EliminationReason | null,
        won: game.winnerPlayerId === p.playerId,
        totalTurnSeconds: turnStat?.totalTurnSeconds ?? 0,
        turnsPlayed: turnStat?.turnsPlayed ?? 0,
      };
    })
    .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));

  const firstPlayer = game.firstPlayerId ? playersById.get(game.firstPlayerId) : undefined;

  return {
    gameId: game.id,
    playedAt: game.playedAt.toISOString(),
    podSize: game.podSize,
    durationSeconds: game.durationSeconds,
    firstPlayerName: firstPlayer?.name ?? null,
    firstPlayerScreenName: firstPlayer?.screenName ?? null,
    participants,
  };
}

export type GamePlayByPlayEntry = {
  id: string;
  elapsedSeconds: number;
  type: "change" | "eliminated" | "revived" | "turnEnded";
  playerId: string;
  playerName: string;
  playerScreenName: string | null;
  lifeDelta: number | null;
  commanderDamageDelta: number | null;
  poisonDelta: number | null;
  radiationDelta: number | null;
  eliminationReason: EliminationReason | null;
  turnDurationSeconds: number | null;
};

export type PlayByPlayTurnBracket = {
  turnPlayerId: string;
  turnPlayerName: string;
  turnPlayerScreenName: string | null;
  durationSeconds: number | null;
  entries: GamePlayByPlayEntry[];
};

export type GamePlayByPlay = {
  hasTurnData: boolean;
  brackets: PlayByPlayTurnBracket[];
  flatEntries: GamePlayByPlayEntry[];
};

export async function getGamePlayByPlay(gameId: string): Promise<GamePlayByPlay> {
  const [rows, participantRows] = await Promise.all([
    db.select().from(gameEvents).where(eq(gameEvents.gameId, gameId)).orderBy(gameEvents.elapsedSeconds),
    db
      .select()
      .from(gameParticipants)
      .where(eq(gameParticipants.gameId, gameId))
      .orderBy(gameParticipants.seatOrder),
  ]);

  const playerIds = Array.from(
    new Set([...rows.map((r) => r.playerId), ...participantRows.map((p) => p.playerId)])
  );
  const playerRows = playerIds.length
    ? await db.select().from(players).where(inArray(players.id, playerIds))
    : [];
  const playersById = new Map(playerRows.map((p) => [p.id, p]));

  const flatEntries: GamePlayByPlayEntry[] = rows.map((r) => ({
    id: r.id,
    elapsedSeconds: r.elapsedSeconds,
    type: r.type as "change" | "eliminated" | "revived" | "turnEnded",
    playerId: r.playerId,
    playerName: playersById.get(r.playerId)?.name ?? "Unknown",
    playerScreenName: playersById.get(r.playerId)?.screenName ?? null,
    lifeDelta: r.lifeDelta,
    commanderDamageDelta: r.commanderDamageDelta,
    poisonDelta: r.poisonDelta,
    radiationDelta: r.radiationDelta,
    eliminationReason: r.eliminationReason as EliminationReason | null,
    turnDurationSeconds: r.turnDurationSeconds,
  }));

  const turnEndedEntries = flatEntries.filter((e) => e.type === "turnEnded");
  const hasTurnData = turnEndedEntries.length > 0;

  const brackets: PlayByPlayTurnBracket[] = [];
  if (hasTurnData) {
    let buffer: GamePlayByPlayEntry[] = [];
    for (const entry of flatEntries) {
      if (entry.type === "turnEnded") {
        brackets.push({
          turnPlayerId: entry.playerId,
          turnPlayerName: entry.playerName,
          turnPlayerScreenName: entry.playerScreenName,
          durationSeconds: entry.turnDurationSeconds,
          entries: buffer,
        });
        buffer = [];
      } else {
        buffer.push(entry);
      }
    }
    if (buffer.length > 0) {
      const lastTurnPlayerId = turnEndedEntries[turnEndedEntries.length - 1].playerId;
      const idx = participantRows.findIndex((p) => p.playerId === lastTurnPlayerId);
      let nextPlayerId: string | null = null;
      if (idx === -1) {
        nextPlayerId = participantRows.find((p) => !p.eliminationReason)?.playerId ?? null;
      } else {
        for (let step = 1; step <= participantRows.length; step++) {
          const candidate = participantRows[(idx + step) % participantRows.length];
          if (!candidate.eliminationReason) {
            nextPlayerId = candidate.playerId;
            break;
          }
        }
      }
      const turnPlayerId = nextPlayerId ?? lastTurnPlayerId;
      brackets.push({
        turnPlayerId,
        turnPlayerName: playersById.get(turnPlayerId)?.name ?? "Unknown",
        turnPlayerScreenName: playersById.get(turnPlayerId)?.screenName ?? null,
        durationSeconds: null,
        entries: buffer,
      });
    }
  }

  return { hasTurnData, brackets, flatEntries };
}

export type GameHistoryEntry = {
  gameId: string;
  playedAt: string;
  podSize: number;
  durationSeconds: number | null;
  winnerName: string | null;
  winnerScreenName: string | null;
};

export async function getGameHistory(
  podSize?: number | null,
  dateRange?: DateRange | null
): Promise<GameHistoryEntry[]> {
  const allGames = await db.select().from(games).orderBy(desc(games.playedAt));

  let filtered = podSize ? allGames.filter((g) => g.podSize === podSize) : allGames;
  if (dateRange) {
    const from = new Date(dateRange.from).getTime();
    const to = new Date(dateRange.to).getTime();
    filtered = filtered.filter((g) => {
      const playedAt = g.playedAt.getTime();
      return playedAt >= from && playedAt <= to;
    });
  }

  const winnerIds = filtered.map((g) => g.winnerPlayerId).filter((x): x is string => Boolean(x));
  const winnerRows = winnerIds.length
    ? await db.select().from(players).where(inArray(players.id, winnerIds))
    : [];
  const winnersById = new Map(winnerRows.map((p) => [p.id, p]));

  return filtered.map((g) => ({
    gameId: g.id,
    playedAt: g.playedAt.toISOString(),
    podSize: g.podSize,
    durationSeconds: g.durationSeconds,
    winnerName: g.winnerPlayerId ? winnersById.get(g.winnerPlayerId)?.name ?? null : null,
    winnerScreenName: g.winnerPlayerId ? winnersById.get(g.winnerPlayerId)?.screenName ?? null : null,
  }));
}
