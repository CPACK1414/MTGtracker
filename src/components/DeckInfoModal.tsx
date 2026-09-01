"use client";

import { useEffect, useState } from "react";
import type { DeckWithStats } from "@/lib/library";
import { getDeckPodMatchup, type DeckPodMatchup } from "@/app/actions";
import { ordinal } from "@/lib/format";

// Scoped to sit inside a single seat's own (already-rotated) card rather
// than a page-wide overlay, so the other seats stay fully interactive while
// this one's info is open — table setup is a simultaneous, self-serve flow.
export default function DeckInfoModal({
  deck,
  podPlayerIds,
  opponentDeckIds,
  onClose,
}: {
  deck: DeckWithStats;
  podPlayerIds: string[];
  opponentDeckIds: string[];
  onClose: () => void;
}) {
  const [matchup, setMatchup] = useState<DeckPodMatchup | null>(null);
  const [loading, setLoading] = useState(true);
  const opponentKey = opponentDeckIds.join(",");
  const podKey = podPlayerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDeckPodMatchup(deck.id, podPlayerIds, opponentDeckIds).then((result) => {
      if (!cancelled) {
        setMatchup(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id, opponentKey, podKey]);

  const timesPlayedLabel =
    deck.gamesPlayed > 0
      ? `${ordinal(deck.gamesPlayed + 1)} time this commander's hit the table — ${deck.wins}-${
          deck.gamesPlayed - deck.wins
        } record`
      : "First time this commander's hit the table";

  return (
    <div className="absolute inset-0 z-20 flex flex-col gap-2 overflow-y-auto rounded-2xl bg-neutral-950/95 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-sm font-bold text-white">{deck.name}</h2>
        <button
          onClick={onClose}
          className="shrink-0 rounded-full bg-neutral-700 px-3 py-1 text-xs font-bold text-neutral-300 active:scale-95"
        >
          Close
        </button>
      </div>

      {deck.flavorText && (
        <p className="whitespace-pre-line rounded-lg bg-neutral-800/60 p-2 text-xs italic text-neutral-300">
          {deck.flavorText}
        </p>
      )}

      <p className="text-xs font-semibold text-emerald-400">{timesPlayedLabel}</p>

      <div className="border-t border-neutral-800 pt-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          With this exact group
        </p>
        {loading ? (
          <p className="text-xs text-neutral-500">Loading…</p>
        ) : matchup?.podRecord ? (
          <p className="text-xs font-semibold text-white">
            {matchup.podRecord.wins}-{matchup.podRecord.losses}
          </p>
        ) : (
          <p className="text-xs text-neutral-500">This exact group hasn&apos;t played together before.</p>
        )}
      </div>

      {opponentDeckIds.length > 0 && (
        <div className="border-t border-neutral-800 pt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Head to head
          </p>
          {loading ? (
            <p className="text-xs text-neutral-500">Loading…</p>
          ) : matchup && matchup.vsDecks.length > 0 ? (
            <div className="flex flex-col gap-1">
              {matchup.vsDecks.map((vs) => (
                <div key={vs.deckId} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-neutral-300">{vs.deckName}</span>
                  <span className="shrink-0 font-semibold text-white">
                    {vs.wins}-{vs.losses}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">No history against these decks yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
