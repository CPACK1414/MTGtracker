"use client";

import { useEffect, useState } from "react";
import { getLayoutTemplate, getValidRotations, gridTemplateAreas, type Rotation } from "@/lib/layout";
import type { PlayerProfile, Deck } from "@/lib/library";
import type { PodSelection } from "@/lib/types";
import RotatableCard from "@/components/RotatableCard";
import ColorPips from "@/components/ColorPips";
import DeckForm from "@/components/DeckForm";
import DeckInfoModal from "@/components/DeckInfoModal";
import { ordinal } from "@/lib/format";

export default function TableSetupScreen({
  players,
  onBack,
  onStart,
  onAddDeck,
}: {
  players: PlayerProfile[];
  onBack?: () => void;
  onStart: (ordered: PodSelection[], rotations: Rotation[]) => void;
  onAddDeck: (
    playerId: string,
    name: string,
    commander: string,
    colors: string,
    artCropUrl: string | null,
    flavorText: string | null
  ) => Promise<Deck>;
}) {
  const template = getLayoutTemplate(players.length);

  const [seatPlayerId, setSeatPlayerId] = useState<(string | null)[]>(() =>
    players.map(() => null)
  );
  const [seatDeckId, setSeatDeckId] = useState<(string | null)[]>(() => players.map(() => null));
  const [seatReady, setSeatReady] = useState<boolean[]>(() => players.map(() => false));
  const [addingDeckAt, setAddingDeckAt] = useState<boolean[]>(() => players.map(() => false));
  const [rotations, setRotations] = useState<Rotation[]>(() =>
    template.placements.map((p) => p.rotation)
  );
  const [showInfoAt, setShowInfoAt] = useState<boolean[]>(() => players.map(() => false));

  useEffect(() => {
    if (players.length > 0 && seatReady.length === players.length && seatReady.every(Boolean)) {
      const ordered: PodSelection[] = seatPlayerId.map((profileId, i) => {
        const player = players.find((p) => p.id === profileId)!;
        const deckId = seatDeckId[i];
        const deck = deckId ? player.decks.find((d) => d.id === deckId) : undefined;
        return {
          profileId: player.id,
          name: player.name,
          screenName: player.screenName,
          deckId: deckId ?? null,
          deckName: deck?.name,
          commander: deck?.commander ?? undefined,
          artCropUrl: deck?.artCropUrl ?? null,
        };
      });
      onStart(ordered, rotations);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatReady]);

  function setAt<T>(setter: (updater: (prev: T[]) => T[]) => void, index: number, value: T) {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function claimSeat(seatIndex: number, playerId: string) {
    if (seatPlayerId.includes(playerId)) return;
    setAt(setSeatPlayerId, seatIndex, playerId);
  }

  function pickDeck(seatIndex: number, deckId: string) {
    setAt(setSeatDeckId, seatIndex, deckId);
  }

  function startAddDeck(seatIndex: number) {
    setAt(setAddingDeckAt, seatIndex, true);
  }

  function saveNewDeck(
    seatIndex: number,
    playerId: string,
    name: string,
    commander: string,
    colors: string,
    artCropUrl: string | null,
    flavorText: string | null
  ) {
    onAddDeck(playerId, name, commander, colors, artCropUrl, flavorText).then((deck) => {
      setAt(setSeatDeckId, seatIndex, deck.id);
      setAt(setAddingDeckAt, seatIndex, false);
    });
  }

  function markReady(seatIndex: number) {
    setAt(setSeatReady, seatIndex, true);
  }

  function unready(seatIndex: number) {
    setAt(setSeatReady, seatIndex, false);
  }

  function rotateSeat(seatIndex: number) {
    const area = template.placements[seatIndex]?.area;
    if (!area) return;
    const validRotations = getValidRotations(players.length, area);
    setRotations((prev) => {
      const next = [...prev];
      const currentIdx = validRotations.indexOf(next[seatIndex]);
      next[seatIndex] = validRotations[(currentIdx + 1) % validRotations.length];
      return next;
    });
  }

  function backOneStep(seatIndex: number) {
    if (addingDeckAt[seatIndex]) {
      setAt(setAddingDeckAt, seatIndex, false);
      return;
    }
    if (seatReady[seatIndex]) {
      setAt(setSeatReady, seatIndex, false);
      return;
    }
    if (seatDeckId[seatIndex] !== null) {
      setAt(setSeatDeckId, seatIndex, null);
      return;
    }
    if (seatPlayerId[seatIndex] !== null) {
      setAt(setSeatPlayerId, seatIndex, null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        {onBack ? (
          <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
            ← Back
          </button>
        ) : (
          <span className="w-12" />
        )}
        <h1 className="text-base font-bold text-white">Set Up Table</h1>
        <span className="w-12" />
      </header>

      <div
        className="min-h-0 flex-1 gap-2 p-2"
        style={{
          display: "grid",
          gridTemplateColumns: template.columns,
          gridTemplateRows: template.rows,
          gridTemplateAreas: gridTemplateAreas(template),
        }}
      >
        {template.placements.map((placement, i) => {
          const player = seatPlayerId[i] ? players.find((p) => p.id === seatPlayerId[i]) : null;
          const deck = player && seatDeckId[i] ? player.decks.find((d) => d.id === seatDeckId[i]) : null;
          const canGoBack = seatPlayerId[i] !== null;

          return (
            <RotatableCard key={i} rotation={rotations[i]} style={{ gridArea: placement.area }}>
              <div
                className={`relative flex h-full w-full flex-col gap-2 rounded-2xl bg-cover bg-center p-3 transition-colors ${
                  seatReady[i]
                    ? "ready-glow border-2 border-emerald-500 bg-neutral-900"
                    : "border border-neutral-800 bg-neutral-900"
                }`}
                style={
                  deck?.artCropUrl
                    ? {
                        backgroundImage: `linear-gradient(rgba(23,23,23,0.75), rgba(23,23,23,0.85)), url("${deck.artCropUrl}")`,
                      }
                    : undefined
                }
              >
                <div className="flex shrink-0 items-center justify-between gap-1">
                  {canGoBack ? (
                    <button
                      onClick={() => backOneStep(i)}
                      aria-label="Back"
                      className="shrink-0 rounded-full bg-neutral-800 px-2 py-1.5 text-sm text-neutral-400 active:scale-95"
                    >
                      ←
                    </button>
                  ) : (
                    <span className="w-8 shrink-0" />
                  )}
                  {player && (
                    <span className="min-w-0 flex-1 truncate text-center text-xs font-bold text-white">
                      {player.name}
                    </span>
                  )}
                  <button
                    onClick={() => rotateSeat(i)}
                    aria-label="Rotate this seat's card"
                    className="shrink-0 rounded-full bg-neutral-800 px-2 py-1.5 text-sm text-neutral-400 active:scale-95"
                  >
                    ⟳
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                  {!player ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                      <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Who&apos;s sitting here?
                      </p>
                      <div className="grid flex-1 grid-cols-2 gap-1.5">
                        {players.map((p) => {
                          const claimedElsewhere = seatPlayerId.some(
                            (id, idx) => id === p.id && idx !== i
                          );
                          return (
                            <button
                              key={p.id}
                              disabled={claimedElsewhere}
                              onClick={() => claimSeat(i, p.id)}
                              className={`flex items-center justify-center rounded-xl px-2 py-2 text-center text-xs font-semibold leading-tight ${
                                claimedElsewhere
                                  ? "bg-neutral-800/40 text-neutral-600"
                                  : "bg-neutral-800 text-white active:scale-95"
                              }`}
                            >
                              {p.name}
                              {p.screenName ? ` (${p.screenName})` : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : !deck ? (
                    <div className="flex flex-1 flex-col gap-2">
                      {addingDeckAt[i] ? (
                        <DeckForm
                          onCancel={() => setAt(setAddingDeckAt, i, false)}
                          onSave={(name, commander, colors, artCropUrl, flavorText) =>
                            saveNewDeck(i, player.id, name, commander, colors, artCropUrl, flavorText)
                          }
                        />
                      ) : (
                        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                          {player.decks.length === 0 && (
                            <p className="rounded-lg bg-neutral-800/60 px-3 py-2 text-xs text-neutral-400">
                              No decks yet for {player.name}.
                            </p>
                          )}
                          {player.decks.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => pickDeck(i, d.id)}
                              className="flex items-center gap-2 rounded-xl bg-neutral-800/60 px-3 py-2.5 text-left active:scale-[0.99]"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                                {d.name}
                              </span>
                              <ColorPips colors={d.colors} />
                            </button>
                          ))}
                          <button
                            onClick={() => startAddDeck(i)}
                            className="rounded-xl border border-dashed border-neutral-700 py-2.5 text-sm font-semibold text-neutral-400 active:scale-95"
                          >
                            + Add Deck
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[65%] truncate text-sm text-neutral-300">{deck.name}</span>
                        <ColorPips colors={deck.colors} />
                        <button
                          onClick={() => setAt(setShowInfoAt, i, true)}
                          aria-label="Deck info"
                          className="shrink-0 rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-blue-300 active:scale-95"
                        >
                          ⓘ
                        </button>
                      </div>
                      {players.length === 2 && (
                        <div className="w-full text-center">
                          {deck.flavorText && (
                            <p className="truncate text-[11px] italic text-neutral-500">
                              {deck.flavorText}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] font-semibold text-emerald-400">
                            {deck.gamesPlayed > 0
                              ? `${ordinal(deck.gamesPlayed + 1)} time this commander's hit the table — ${
                                  deck.wins
                                }-${deck.gamesPlayed - deck.wins} record`
                              : "First time this commander's hit the table"}
                          </p>
                        </div>
                      )}
                      {seatReady[i] ? (
                        <>
                          <p className="w-full text-center text-xs font-semibold text-emerald-300">
                            {player.name} is shuffled and ready
                          </p>
                          <button
                            onClick={() => unready(i)}
                            className="rounded-full bg-emerald-500/20 px-5 py-2 text-base font-bold text-emerald-400 active:scale-95"
                          >
                            ✓ Ready
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="w-full rounded-lg bg-black/50 px-2 py-1 text-center text-xs font-semibold text-amber-300">
                            Shuffle your deck and draw your hand, then tap Ready
                          </p>
                          <button
                            onClick={() => markReady(i)}
                            className="rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
                          >
                            Ready Up
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {showInfoAt[i] && deck && (
                  <DeckInfoModal
                    deck={deck}
                    podPlayerIds={players.map((p) => p.id)}
                    opponentDeckIds={seatDeckId.filter(
                      (id, idx): id is string => idx !== i && id !== null
                    )}
                    onClose={() => setAt(setShowInfoAt, i, false)}
                  />
                )}
              </div>
            </RotatableCard>
          );
        })}
      </div>
    </div>
  );
}
