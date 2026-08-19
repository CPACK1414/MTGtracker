"use server";

import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { commanderDamage, decks, gameParticipants, games, players } from "@/db/schema";
import { STARTING_LIFE } from "@/lib/types";
import type { Deck, PlayerProfile } from "@/lib/library";

function friendlyDbError(e: unknown, context: string): never {
  if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23503") {
    throw new Error(
      `Can't delete this ${context} — it's referenced by past game history.`
    );
  }
  throw e;
}

export async function getPlayersWithDecks(): Promise<PlayerProfile[]> {
  const [allPlayers, allDecks] = await Promise.all([
    db.select().from(players).orderBy(players.createdAt),
    db.select().from(decks).orderBy(decks.createdAt),
  ]);

  const decksByPlayer = new Map<string, Deck[]>();
  for (const d of allDecks) {
    const list = decksByPlayer.get(d.playerId) ?? [];
    list.push(d);
    decksByPlayer.set(d.playerId, list);
  }

  return allPlayers.map((p) => ({ ...p, decks: decksByPlayer.get(p.id) ?? [] }));
}

export async function createPlayer(name: string): Promise<PlayerProfile> {
  const [player] = await db.insert(players).values({ name }).returning();
  return { ...player, decks: [] };
}

export async function renamePlayer(id: string, name: string): Promise<void> {
  await db.update(players).set({ name }).where(eq(players.id, id));
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
  colors: string
): Promise<Deck> {
  const [deck] = await db
    .insert(decks)
    .values({
      playerId,
      name,
      commander: commander || null,
      colors: colors || null,
    })
    .returning();
  return deck;
}

export async function updateDeck(
  deckId: string,
  name: string,
  commander: string,
  colors: string
): Promise<void> {
  await db
    .update(decks)
    .set({ name, commander: commander || null, colors: colors || null })
    .where(eq(decks.id, deckId));
}

export async function deleteDeck(deckId: string): Promise<void> {
  try {
    await db.delete(decks).where(eq(decks.id, deckId));
  } catch (e) {
    friendlyDbError(e, "deck");
  }
}

export type SaveGamePayload = {
  podSize: number;
  durationSeconds: number;
  winnerPlayerId: string | null;
  winnerDeckId: string | null;
  participants: {
    playerId: string;
    deckId: string | null;
    seatOrder: number;
    finalLife: number;
    placement: number;
    eliminationReason: "dead" | "scoop" | null;
  }[];
  damage: { fromPlayerId: string; toPlayerId: string; amount: number }[];
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

    return game;
  });

  return { id: game.id };
}

export type PlayerStats = {
  id: string;
  name: string;
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

export type DeckMatchup = {
  deckAId: string;
  deckAName: string;
  deckAPlayerName: string;
  deckBId: string;
  deckBName: string;
  deckBPlayerName: string;
  aWins: number;
  bWins: number;
};

export type ReportingData = {
  players: PlayerStats[];
  decks: DeckStats[];
  matchups: DeckMatchup[];
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

  const matchupMap = new Map<string, DeckMatchup>();
  for (const game of allGames) {
    if (!game.winnerDeckId) continue;
    const gp = allParticipants.filter((p) => p.gameId === game.id);
    const distinctDecks = new Set(
      gp.map((p) => p.deckId).filter((x): x is string => Boolean(x))
    );
    if (distinctDecks.size < 2) continue;

    for (const p of gp) {
      if (!p.deckId || p.deckId === game.winnerDeckId) continue;
      const [a, b] = [game.winnerDeckId, p.deckId].sort();
      const key = `${a}|${b}`;
      let m = matchupMap.get(key);
      if (!m) {
        m = {
          deckAId: a,
          deckAName: decksById.get(a)?.name ?? "Unknown deck",
          deckAPlayerName: playersById.get(decksById.get(a)?.playerId ?? "")?.name ?? "",
          deckBId: b,
          deckBName: decksById.get(b)?.name ?? "Unknown deck",
          deckBPlayerName: playersById.get(decksById.get(b)?.playerId ?? "")?.name ?? "",
          aWins: 0,
          bWins: 0,
        };
        matchupMap.set(key, m);
      }
      if (a === game.winnerDeckId) m.aWins += 1;
      else m.bWins += 1;
    }
  }

  const matchups = Array.from(matchupMap.values()).sort(
    (a, b) => b.aWins + b.bWins - (a.aWins + a.bWins)
  );

  return { players: playerStats, decks: deckStats, matchups };
}

export type PlayerGameHistoryEntry = {
  gameId: string;
  playedAt: string;
  durationSeconds: number | null;
  podSize: number;
  placement: number | null;
  won: boolean;
  eliminationReason: "dead" | "scoop" | null;
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
      eliminationReason: r.eliminationReason as "dead" | "scoop" | null,
      deckName: deck?.name ?? null,
      commander: deck?.commander ?? null,
    };
  });
}

export type GameDetailParticipant = {
  playerId: string;
  playerName: string;
  deckName: string | null;
  commander: string | null;
  placement: number | null;
  finalLife: number | null;
  eliminationReason: "dead" | "scoop" | null;
  won: boolean;
};

export type GameDetail = {
  gameId: string;
  playedAt: string;
  podSize: number;
  durationSeconds: number | null;
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
        deckName: deck?.name ?? null,
        commander: deck?.commander ?? null,
        placement: p.placement,
        finalLife: p.finalLife,
        eliminationReason: p.eliminationReason as "dead" | "scoop" | null,
        won: game.winnerPlayerId === p.playerId,
      };
    })
    .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));

  return {
    gameId: game.id,
    playedAt: game.playedAt.toISOString(),
    podSize: game.podSize,
    durationSeconds: game.durationSeconds,
    participants,
  };
}

export type GameHistoryEntry = {
  gameId: string;
  playedAt: string;
  podSize: number;
  durationSeconds: number | null;
  winnerName: string | null;
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
  const winnersById = new Map(winnerRows.map((p) => [p.id, p.name]));

  return filtered.map((g) => ({
    gameId: g.id,
    playedAt: g.playedAt.toISOString(),
    podSize: g.podSize,
    durationSeconds: g.durationSeconds,
    winnerName: g.winnerPlayerId ? winnersById.get(g.winnerPlayerId) ?? null : null,
  }));
}
