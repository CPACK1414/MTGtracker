export type LivePodSnapshot = {
  players: { id: string; name: string; life: number; eliminated: boolean }[];
  damage: Record<string, Record<string, number>>;
  currentTurnPlayerId: string | null;
  elapsedSeconds: number;
  updatedAt: number;
};

export type PodStatus = "pending" | "shared" | "in_progress" | "complete";

export function derivePodStatus(
  pod: { completedAt: Date | null; startedAt: Date | null; sharedAt: Date | null },
  isOrganizerPod: boolean
): PodStatus {
  if (pod.completedAt) return "complete";
  if (pod.startedAt) return "in_progress";
  if (pod.sharedAt || isOrganizerPod) return "shared";
  return "pending";
}

export type BracketResult = { pods: string[][]; autoAdvance: string | null };

// Single-elimination bracket generation. The caller shuffles/orders
// playerIds first (round 1: randomized roster; later rounds: prior
// round's winners in podIndex order, to preserve seeding). When the
// player count doesn't divide evenly into pods of targetSize, pods are
// shrunk (never below 2) rather than inventing an explicit "bye" slot —
// the only true auto-advance case is a single unavoidable leftover
// player after pods have already been shrunk as far as they can go.
export function generatePods(playerIds: string[], targetSize: number): BracketResult {
  const n = playerIds.length;
  if (n === 0) return { pods: [], autoAdvance: null };
  if (n === 1) return { pods: [], autoAdvance: playerIds[0] };

  const numFullPods = Math.floor(n / targetSize);
  const remainder = n % targetSize;

  if (remainder === 0) {
    return { pods: sizeSplit(playerIds, Array(numFullPods).fill(targetSize)), autoAdvance: null };
  }
  if (remainder >= 2) {
    return {
      pods: sizeSplit(playerIds, [...Array(numFullPods).fill(targetSize), remainder]),
      autoAdvance: null,
    };
  }

  // remainder === 1
  if (targetSize === 2) {
    // Already at the global minimum pod size — can't shrink further, so
    // the one leftover player auto-advances without playing this round.
    const podPlayers = playerIds.slice(0, numFullPods * 2);
    return {
      pods: sizeSplit(podPlayers, Array(numFullPods).fill(2)),
      autoAdvance: playerIds[numFullPods * 2],
    };
  }
  // targetSize >= 3: borrow one seat from the last full pod (size-1,
  // still >= 2) and pair it with the leftover player (a pod of 2).
  const sizes = [...Array(numFullPods - 1).fill(targetSize), targetSize - 1, 2];
  return { pods: sizeSplit(playerIds, sizes), autoAdvance: null };
}

function sizeSplit(ids: string[], sizes: number[]): string[][] {
  const pods: string[][] = [];
  let i = 0;
  for (const size of sizes) {
    pods.push(ids.slice(i, i + size));
    i += size;
  }
  return pods;
}
