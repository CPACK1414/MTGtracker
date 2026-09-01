import { pgTable, uuid, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  screenName: text("screen_name"),
  email: text("email"),
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
  flavorText: text("flavor_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
  durationSeconds: integer("duration_seconds"),
  podSize: integer("pod_size").notNull(),
  winnerPlayerId: uuid("winner_player_id").references(() => players.id),
  winnerDeckId: uuid("winner_deck_id").references(() => decks.id),
  firstPlayerId: uuid("first_player_id").references(() => players.id),
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

export const gameEvents = pgTable("game_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  elapsedSeconds: integer("elapsed_seconds").notNull(),
  type: text("type").notNull(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  lifeDelta: integer("life_delta"),
  commanderDamageDelta: integer("commander_damage_delta"),
  poisonDelta: integer("poison_delta"),
  radiationDelta: integer("radiation_delta"),
  eliminationReason: text("elimination_reason"),
  turnDurationSeconds: integer("turn_duration_seconds"),
});

export const dailyRecapSent = pgTable(
  "daily_recap_sent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    summaryDate: text("summary_date").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("daily_recap_sent_player_date_idx").on(table.playerId, table.summaryDate)]
);

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
