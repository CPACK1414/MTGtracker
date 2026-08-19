export type Player = {
  id: string;
  profileId: string;
  deckId: string | null;
  name: string;
  deckName?: string;
  commander?: string;
  artCropUrl?: string | null;
  life: number;
  eliminated: boolean;
  eliminationReason?: "dead" | "scoop";
};

export type PodSelection = {
  profileId: string;
  name: string;
  screenName?: string | null;
  deckId: string | null;
  deckName?: string;
  commander?: string;
  artCropUrl?: string | null;
};

export const STARTING_LIFE = 40;
export const COMMANDER_DAMAGE_LETHAL = 21;
export const POISON_LETHAL = 10;

export const MIN_POD_SIZE = 2;
export const MAX_POD_SIZE = 8;

export function makePlayers(selections: PodSelection[]): Player[] {
  return selections.map((s) => ({
    id: s.profileId,
    profileId: s.profileId,
    deckId: s.deckId,
    name: s.screenName?.trim() || s.name,
    deckName: s.deckName,
    commander: s.commander,
    artCropUrl: s.artCropUrl,
    life: STARTING_LIFE,
    eliminated: false,
  }));
}

export function makeEmptyDamage(players: Player[]): Record<string, Record<string, number>> {
  const damage: Record<string, Record<string, number>> = {};
  for (const from of players) {
    damage[from.id] = {};
    for (const to of players) {
      if (from.id === to.id) continue;
      damage[from.id][to.id] = 0;
    }
  }
  return damage;
}
