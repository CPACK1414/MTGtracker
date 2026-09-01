"use client";

import { useEffect, useState } from "react";
import { getTournamentLiveState, type TournamentLivePodView } from "@/app/tournamentActions";
import { formatHoursMinutes } from "@/lib/format";

const POLL_MS = 20000;

export default function LiveResultsScreen({
  tournamentId,
  initial,
}: {
  tournamentId: string;
  initial: { round: number; pods: TournamentLivePodView[] };
}) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    const interval = setInterval(() => {
      getTournamentLiveState(tournamentId).then((s) => {
        if (s) setState(s);
      });
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [tournamentId]);

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-6">
      <h1 className="mb-4 text-center text-base font-bold text-white">
        Live Results — Round {state.round}
      </h1>
      <div className="flex flex-col gap-4">
        {state.pods.map((pod) => (
          <PodLiveSection key={pod.id} pod={pod} />
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-neutral-600">Updates every 20 seconds</p>
    </div>
  );
}

function totalCommanderDamage(damage: Record<string, Record<string, number>>, playerId: string): number {
  let total = 0;
  for (const targets of Object.values(damage)) {
    total += targets[playerId] ?? 0;
  }
  return total;
}

function PodLiveSection({ pod }: { pod: TournamentLivePodView }) {
  const names = pod.participants.map((p) => p.name).join(", ");

  if (pod.isAutoAdvance) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-center">
        <p className="text-sm text-neutral-400">🎉 {names} advanced automatically</p>
      </div>
    );
  }

  if (pod.status === "complete") {
    const winnerName = pod.participants.find((p) => p.playerId === pod.winnerPlayerId)?.name;
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{names}</p>
        <p className="text-lg font-bold text-white">🏆 {winnerName ?? "Winner"}</p>
      </div>
    );
  }

  if (!pod.snapshot) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{names}</p>
        <p className="text-sm text-neutral-500">Not started yet</p>
      </div>
    );
  }

  const snapshot = pod.snapshot;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{names}</p>
        <p className="text-xs text-neutral-500">{formatHoursMinutes(snapshot.elapsedSeconds)}</p>
      </div>
      <div className="flex flex-col divide-y divide-neutral-800">
        {snapshot.players.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 py-2">
            <span className={`min-w-0 flex-1 truncate text-sm ${p.eliminated ? "text-neutral-600 line-through" : "text-neutral-100"}`}>
              {p.name}
              {p.id === snapshot.currentTurnPlayerId && !p.eliminated && (
                <span className="ml-1.5 text-[10px] font-bold text-emerald-400">TURN</span>
              )}
            </span>
            <span className="shrink-0 text-xs text-neutral-500">
              CMD {totalCommanderDamage(snapshot.damage, p.id)}
            </span>
            <span className={`w-10 shrink-0 text-right text-lg font-black tabular-nums ${p.eliminated ? "text-neutral-600" : p.life <= 0 ? "text-red-500" : p.life <= 10 ? "text-amber-400" : "text-neutral-50"}`}>
              {p.life}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
