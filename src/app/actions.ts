"use server";

import { eq } from "drizzle-orm";
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
  winnerPlayerId: string | null;
  winnerDeckId: string | null;
  participants: {
    playerId: string;
    deckId: string | null;
    seatOrder: number;
    finalLife: number;
    placement: number;
  }[];
  damage: { fromPlayerId: string; toPlayerId: string; amount: number }[];
};

export async function saveGame(payload: SaveGamePayload): Promise<{ id: string }> {
  const game = await db.transaction(async (tx) => {
    const [game] = await tx
      .insert(games)
      .values({
        podSize: payload.podSize,
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
