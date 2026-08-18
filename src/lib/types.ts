export type Player = {
  id: string;
  name: string;
  life: number;
  eliminated: boolean;
};

export const STARTING_LIFE = 40;
export const COMMANDER_DAMAGE_LETHAL = 21;

export const MIN_POD_SIZE = 2;
export const MAX_POD_SIZE = 8;

export function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Player ${i + 1}`,
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
