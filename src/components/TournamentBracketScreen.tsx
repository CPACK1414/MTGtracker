"use client";

import { useEffect, useRef, useState } from "react";
import { getTournamentState, type TournamentStateView } from "@/app/tournamentActions";
import type { PlayerProfile } from "@/lib/library";

const POLL_MS = 20000;

const STATUS_LABEL: Record<string, string> = {
  pending: "Not shared yet",
  shared: "Waiting to start",
  in_progress: "Playing",
  complete: "Done",
};

export default function TournamentBracketScreen({
  tournamentId,
  startRound,
  libraryPlayers,
  onAdvancedRound,
  onDone,
}: {
  tournamentId: string;
  startRound: number;
  libraryPlayers: PlayerProfile[];
  onAdvancedRound: () => void;
  onDone: () => void;
}) {
  const [state, setState] = useState<TournamentStateView | null>(null);
  // Seeded with the round the organizer's just-finished pod belonged to,
  // not discovered from the first poll — their own game finishing can be
  // exactly what completes the round, so by the time this screen's first
  // poll runs, the server may have already advanced to the next round.
  // Starting from "unknown" would treat that already-advanced round as
  // the baseline and silently swallow the redirect to its Share Links.
  const seenRoundRef = useRef<number>(startRound);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      getTournamentState(tournamentId).then((s) => {
        if (cancelled) return;
        if (s.status === "in_progress" && s.currentRound > seenRoundRef.current) {
          onAdvancedRound();
          return;
        }
        setState(s);
      });
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (state.status === "complete") {
    const winner = libraryPlayers.find((p) => p.id === state.winnerPlayerId);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-4xl">🏆</p>
        <p className="text-2xl font-bold text-white">{winner?.name ?? "Winner"} wins the tournament!</p>
        <button
          onClick={onDone}
          className="mt-4 rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-bold text-white active:scale-95"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col items-center gap-1 border-b border-neutral-800 px-4 py-3 text-center">
        <h1 className="text-base font-bold text-white">Round {state.currentRound} — Waiting</h1>
        <a
          href={`/tournament/${state.id}/live`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-indigo-400 underline"
        >
          Live Results
        </a>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {state.pods.map((pod) => {
            const names = pod.participants.map((p) => p.name).join(", ");
            const winnerName = pod.winnerPlayerId
              ? libraryPlayers.find((p) => p.id === pod.winnerPlayerId)?.name
              : null;
            return (
              <div key={pod.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <p className="mb-1 text-sm font-semibold text-white">{names}</p>
                <p
                  className={`text-xs font-semibold ${
                    pod.status === "complete" ? "text-emerald-400" : "text-neutral-500"
                  }`}
                >
                  {pod.status === "complete" && winnerName
                    ? `${winnerName} won`
                    : STATUS_LABEL[pod.status]}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-neutral-600">
          Checking for updates every 20 seconds…
        </p>
      </div>
    </div>
  );
}
