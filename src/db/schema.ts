import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  screenName: text("screen_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  commander: text("commander"),
  colors: text("colors"),
  moxfieldUrl: text("moxfield_url"),
  artCropUrl: text("art_crop_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
  durationSeconds: integer("duration_seconds"),
  podSize: integer("pod_size").notNull(),
  winnerPlayerId: uuid("winner_player_id").references(() => players.id),
  winnerDeckId: uuid("winner_deck_id").references(() => decks.id),
  notes: text("notes"),
});

export const gameParticipants = pgTable("game_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  deckId: uuid("deck_id").references(() => decks.id),
  seatOrder: integer("seat_order").notNull(),
  startingLife: integer("starting_life").notNull().default(40),
  finalLife: integer("final_life"),
  placement: integer("placement"),
  eliminatedById: uuid("eliminated_by_id").references(() => players.id),
  eliminationReason: text("elimination_reason"),
});

export const commanderDamage = pgTable("commander_damage", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  dealtByPlayerId: uuid("dealt_by_player_id")
    .notNull()
    .references(() => players.id),
  dealtToPlayerId: uuid("dealt_to_player_id")
    .notNull()
    .references(() => players.id),
  amount: integer("amount").notNull().default(0),
});
