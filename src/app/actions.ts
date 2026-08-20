"use server";

import { desc, eq, inArray } from "drizzle-orm";
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

export async function createPlayer(name: string): Promise<PlayerProfile> {
  await ensureUniqueNames(name, null);
  const [player] = await db.insert(players).values({ name }).returning();
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
  type: "change" | "eliminated" | "revived";
  playerId: string;
  lifeDelta?: number;
  commanderDamageDelta?: number;
  poisonDelta?: number;
  radiationDelta?: number;
  eliminationReason?: EliminationReason | null;
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

export type ReportingData = {
  players: PlayerStats[];
  decks: DeckStats[];
  deckMatchups: DeckGroupMatchup[];
  playerMatchups: PlayerGroupMatchup[];
};

export type DateRange = { from: string; to: string };

export async function getReportingData(
  podSize?: number | null,
  dateRange?: DateRange | null
): Promise<ReportingData> {
  const [allPlayers, allDecks, allGamesRaw, allParticipantsRaw] = await Promise.all([
    db.select().from(players),
    db.select().from(decks),
    db.select().from(games),
    db.select().from(gameParticipants),
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
  const allParticipants = podSize
    ? allParticipantsRaw.filter((p) => gameIds.has(p.gameId))
    : allParticipantsRaw;

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

  return { players: playerStats, decks: deckStats, deckMatchups, playerMatchups };
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

  const participants: GameDetailParticipant[] = participantRows
    .map((p) => {
      const deck = p.deckId ? decksById.get(p.deckId) : undefined;
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
  type: "change" | "eliminated" | "revived";
  playerId: string;
  playerName: string;
  playerScreenName: string | null;
  lifeDelta: number | null;
  commanderDamageDelta: number | null;
  poisonDelta: number | null;
  radiationDelta: number | null;
  eliminationReason: EliminationReason | null;
};

export async function getGamePlayByPlay(gameId: string): Promise<GamePlayByPlayEntry[]> {
  const rows = await db
    .select()
    .from(gameEvents)
    .where(eq(gameEvents.gameId, gameId))
    .orderBy(gameEvents.elapsedSeconds);

  const playerIds = Array.from(new Set(rows.map((r) => r.playerId)));
  const playerRows = playerIds.length
    ? await db.select().from(players).where(inArray(players.id, playerIds))
    : [];
  const playersById = new Map(playerRows.map((p) => [p.id, p]));

  return rows.map((r) => ({
    id: r.id,
    elapsedSeconds: r.elapsedSeconds,
    type: r.type as "change" | "eliminated" | "revived",
    playerId: r.playerId,
    playerName: playersById.get(r.playerId)?.name ?? "Unknown",
    playerScreenName: playersById.get(r.playerId)?.screenName ?? null,
    lifeDelta: r.lifeDelta,
    commanderDamageDelta: r.commanderDamageDelta,
    poisonDelta: r.poisonDelta,
    radiationDelta: r.radiationDelta,
    eliminationReason: r.eliminationReason as EliminationReason | null,
  }));
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
