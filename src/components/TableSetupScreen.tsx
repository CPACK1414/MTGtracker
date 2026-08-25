"use client";

import { useEffect, useState } from "react";
import { getLayoutTemplate, getValidRotations, gridTemplateAreas, type Rotation } from "@/lib/layout";
import type { PlayerProfile, Deck } from "@/lib/library";
import type { PodSelection } from "@/lib/types";
import RotatableCard from "@/components/RotatableCard";
import ColorPips from "@/components/ColorPips";
import DeckForm from "@/components/DeckForm";

export default function TableSetupScreen({
  players,
  onBack,
  onStart,
  onAddDeck,
}: {
  players: PlayerProfile[];
  onBack: () => void;
  onStart: (ordered: PodSelection[], rotations: Rotation[]) => void;
  onAddDeck: (
    playerId: string,
    name: string,
    commander: string,
    colors: string,
    artCropUrl: string | null
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
    artCropUrl: string | null
  ) {
    onAddDeck(playerId, name, commander, colors, artCropUrl).then((deck) => {
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
        <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
          ← Back
        </button>
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
                className={`flex h-full w-full flex-col gap-2 rounded-2xl bg-cover bg-center p-3 transition-colors ${
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
                <div className="flex shrink-0 items-center justify-between">
                  {canGoBack ? (
                    <button
                      onClick={() => backOneStep(i)}
                      aria-label="Back"
                      className="rounded-full bg-neutral-800 px-2 py-1.5 text-sm text-neutral-400 active:scale-95"
                    >
                      ←
                    </button>
                  ) : (
                    <span className="w-8" />
                  )}
                  <button
                    onClick={() => rotateSeat(i)}
                    aria-label="Rotate this seat's card"
                    className="rounded-full bg-neutral-800 px-2 py-1.5 text-sm text-neutral-400 active:scale-95"
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
                      <p className="shrink-0 text-center text-sm font-bold text-white">{player.name}</p>
                      {addingDeckAt[i] ? (
                        <DeckForm
                          onCancel={() => setAt(setAddingDeckAt, i, false)}
                          onSave={(name, commander, colors, artCropUrl) =>
                            saveNewDeck(i, player.id, name, commander, colors, artCropUrl)
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
                    <div className="flex flex-1 flex-col items-center justify-center gap-4">
                      <p className="text-sm font-bold text-white">{player.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[80%] truncate text-sm text-neutral-300">{deck.name}</span>
                        <ColorPips colors={deck.colors} />
                      </div>
                      {seatReady[i] ? (
                        <button
                          onClick={() => unready(i)}
                          className="rounded-full bg-emerald-500/20 px-6 py-3 text-lg font-bold text-emerald-400 active:scale-95"
                        >
                          ✓ Ready
                        </button>
                      ) : (
                        <button
                          onClick={() => markReady(i)}
                          className="rounded-2xl bg-emerald-500 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                          Ready Up
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </RotatableCard>
          );
        })}
      </div>
    </div>
  );
}
