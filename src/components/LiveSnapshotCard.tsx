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
// Results view and the cross-device "Live Games" list on the home
// screen, so both stay visually consistent.
export default function LiveSnapshotCard({ title, snapshot }: { title: string; snapshot: LivePodSnapshot }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
        <p className="text-xs text-neutral-500">{formatHoursMinutes(snapshot.elapsedSeconds)}</p>
      </div>
      <div className="flex flex-col divide-y divide-neutral-800">
        {snapshot.players.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 py-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm ${
                p.eliminated ? "text-neutral-600 line-through" : "text-neutral-100"
              }`}
            >
              {p.name}
              {p.id === snapshot.currentTurnPlayerId && !p.eliminated && (
                <span className="ml-1.5 text-[10px] font-bold text-emerald-400">TURN</span>
              )}
            </span>
            <span className="shrink-0 text-xs text-neutral-500">
              CMD {totalCommanderDamage(snapshot.damage, p.id)}
            </span>
            <span
              className={`w-10 shrink-0 text-right text-lg font-black tabular-nums ${
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
