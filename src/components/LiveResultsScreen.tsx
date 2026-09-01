"use client";

import { useEffect, useState } from "react";
import { getTournamentLiveState, type TournamentLivePodView } from "@/app/tournamentActions";
import LiveSnapshotCard from "@/components/LiveSnapshotCard";

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

  return <LiveSnapshotCard title={names} snapshot={pod.snapshot} />;
}
