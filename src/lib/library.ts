import type { InferSelectModel } from "drizzle-orm";
import type { decks, players } from "@/db/schema";

export type Deck = InferSelectModel<typeof decks>;
export type PlayerProfile = InferSelectModel<typeof players> & { decks: Deck[] };
