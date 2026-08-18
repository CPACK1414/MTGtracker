export type Player = {
  id: string;
  profileId: string;
  name: string;
  deckName?: string;
  commander?: string;
  life: number;
  eliminated: boolean;
};

export type PodSelection = {
  profileId: string;
  name: string;
  deckId: string | null;
  deckName?: string;
  commander?: string;
};

export const STARTING_LIFE = 40;
export const COMMANDER_DAMAGE_LETHAL = 21;

export const MIN_POD_SIZE = 2;
export const MAX_POD_SIZE = 8;

export function makePlayers(selections: PodSelection[]): Player[] {
  return selections.map((s) => ({
    id: s.profileId,
    profileId: s.profileId,
    name: s.name,
    deckName: s.deckName,
    commander: s.commander,
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
