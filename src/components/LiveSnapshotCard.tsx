import type { LivePodSnapshot } from "@/lib/tournament";
import { formatHoursMinutes } from "@/lib/format";

function totalCommanderDamage(damage: Record<string, Record<string, number>>, playerId: string): number {
  let total = 0;
  for (const targets of Object.values(damage)) {
    total += targets[playerId] ?? 0;
  }
  return total;
}

// Compact read-only life/damage/turn/elapsed-time display for one live
// game's current snapshot — shared between the tournament round's Live
// Results view, the phone-sized cross-device "Live Games" list, and the
// large TV/kiosk board. `size="large"` scales everything up for viewing
// from across a room instead of held in hand.
export default function LiveSnapshotCard({
  title,
  snapshot,
  size = "compact",
}: {
  title: string;
  snapshot: LivePodSnapshot;
  size?: "compact" | "large";
}) {
  const large = size === "large";

  return (
    <div
      className={`rounded-2xl border border-neutral-800 bg-neutral-900 ${large ? "p-6" : "p-4"}`}
    >
      <div className={`flex items-center justify-between ${large ? "mb-4" : "mb-2"}`}>
        <p
          className={`font-semibold uppercase tracking-wide text-neutral-500 ${
            large ? "text-lg" : "text-xs"
          }`}
        >
          {title}
        </p>
        <p className={`text-neutral-500 ${large ? "text-lg" : "text-xs"}`}>
          {formatHoursMinutes(snapshot.elapsedSeconds)}
        </p>
      </div>
      <div className="flex flex-col divide-y divide-neutral-800">
        {snapshot.players.map((p) => (
          <div key={p.id} className={`flex items-center justify-between gap-3 ${large ? "py-4" : "py-2"}`}>
            <span
              className={`min-w-0 flex-1 truncate ${large ? "text-2xl" : "text-sm"} ${
                p.eliminated ? "text-neutral-600 line-through" : "text-neutral-100"
              }`}
            >
              {p.name}
              {p.id === snapshot.currentTurnPlayerId && !p.eliminated && (
                <span
                  className={`ml-2 font-bold text-emerald-400 ${large ? "text-sm" : "text-[10px]"}`}
                >
                  TURN
                </span>
              )}
            </span>
            <span className={`shrink-0 text-neutral-500 ${large ? "text-lg" : "text-xs"}`}>
              CMD {totalCommanderDamage(snapshot.damage, p.id)}
            </span>
            <span
              className={`shrink-0 text-right font-black tabular-nums ${large ? "w-20 text-5xl" : "w-10 text-lg"} ${
                p.eliminated
                  ? "text-neutral-600"
                  : p.life <= 0
                  ? "text-red-500"
                  : p.life <= 10
                  ? "text-amber-400"
                  : "text-neutral-50"
              }`}
            >
              {p.life}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
