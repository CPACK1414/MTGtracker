"use client";

import { useEffect, useState } from "react";
import {
  getTournamentState,
  markPodShared,
  reassignRound,
  reshuffleRound,
  type TournamentPodView,
  type TournamentStateView,
} from "@/app/tournamentActions";
import TournamentManualPairingScreen from "@/components/TournamentManualPairingScreen";

export default function TournamentShareLinksScreen({
  tournamentId,
  onStartOwnPod,
}: {
  tournamentId: string;
  onStartOwnPod: (pod: TournamentPodView) => void;
}) {
  const [state, setState] = useState<TournamentStateView | null>(null);
  const [sharedLocally, setSharedLocally] = useState<Set<string>>(new Set());
  const [shuffling, setShuffling] = useState(false);
  const [showManualPairing, setShowManualPairing] = useState(false);
  const [reshuffleError, setReshuffleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTournamentState(tournamentId).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  async function share(pod: TournamentPodView) {
    const url = `${window.location.origin}/t/${pod.id}`;
    setSharedLocally((prev) => new Set(prev).add(pod.id));
    markPodShared(pod.id).catch(() => {});
    if (navigator.share) {
      try {
        await navigator.share({ title: "MTG Tournament Pod", url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // best-effort — nothing more we can do here
    }
  }

  async function shuffle() {
    setShuffling(true);
    setReshuffleError(null);
    try {
      const next = await reshuffleRound(tournamentId);
      setState(next);
      setSharedLocally(new Set());
    } catch (e) {
      setReshuffleError(e instanceof Error ? e.message : "Couldn't reshuffle. Try again.");
    } finally {
      setShuffling(false);
    }
  }

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (showManualPairing) {
    const pool = state.pods.flatMap((pod) => pod.participants);
    return (
      <TournamentManualPairingScreen
        players={pool}
        podSize={state.podSize}
        onCancel={() => setShowManualPairing(false)}
        onSave={async (pods, autoAdvance) => {
          try {
            const next = await reassignRound(tournamentId, pods, autoAdvance);
            setState(next);
            setSharedLocally(new Set());
            setShowManualPairing(false);
          } catch (e) {
            setReshuffleError(e instanceof Error ? e.message : "Couldn't save pairings. Try again.");
            setShowManualPairing(false);
          }
        }}
      />
    );
  }

  const otherPodsAllShared = state.pods.every(
    (pod) =>
      pod.isOrganizerPod || pod.isAutoAdvance || pod.status !== "pending" || sharedLocally.has(pod.id)
  );
  const canReshuffle = state.canReshuffleRound && sharedLocally.size === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col items-center gap-1 border-b border-neutral-800 px-4 py-3 text-center">
        <h1 className="text-base font-bold text-white">Round {state.currentRound} — Share Links</h1>
        <a
          href={`/tournament/${state.id}/live`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-indigo-400 underline"
        >
          Live Results
        </a>
        {canReshuffle && (
          <div className="mt-1 flex gap-2">
            <button
              disabled={shuffling}
              onClick={shuffle}
              className="rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 active:scale-95 disabled:opacity-50"
            >
              {shuffling ? "Shuffling…" : "🔀 Shuffle"}
            </button>
            <button
              onClick={() => setShowManualPairing(true)}
              className="rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 active:scale-95"
            >
              Manual Select
            </button>
          </div>
        )}
        {reshuffleError && <p className="mt-1 text-xs text-red-400">{reshuffleError}</p>}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {state.pods.map((pod) => {
            const names = pod.participants.map((p) => p.name).join(", ");
            if (pod.isAutoAdvance) {
              return (
                <div
                  key={pod.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-center"
                >
                  <p className="text-sm text-neutral-400">🎉 {names} advances automatically</p>
                </div>
              );
            }
            if (pod.isOrganizerPod) {
              return (
                <div key={pod.id} className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <p className="mb-2 text-sm font-semibold text-white">{names}</p>
                  <p className="mb-3 text-xs text-emerald-400">Your Pod</p>
                  <button
                    disabled={!otherPodsAllShared}
                    onClick={() => onStartOwnPod(pod)}
                    className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
                  >
                    Start
                  </button>
                  {!otherPodsAllShared && (
                    <p className="mt-2 text-center text-xs text-neutral-500">
                      Share the other pods first
                    </p>
                  )}
                </div>
              );
            }
            const shared = pod.status !== "pending" || sharedLocally.has(pod.id);
            return (
              <div key={pod.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <p className="mb-3 text-sm font-semibold text-white">{names}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => share(pod)}
                    className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white active:scale-95"
                  >
                    Share
                  </button>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                      shared ? "bg-emerald-500 text-white" : "bg-neutral-800 text-neutral-600"
                    }`}
                  >
                    {shared ? "✓" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
