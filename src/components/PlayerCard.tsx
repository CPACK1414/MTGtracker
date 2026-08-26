"use client";

import { useEffect, useRef, useState } from "react";
import type { Player } from "@/lib/types";
import DamageGrid from "@/components/DamageGrid";
import { useHoldRepeat } from "@/lib/useHoldRepeat";
import { playDecrementSound, playIncrementSound } from "@/lib/sound";
import { useCardSizeTier } from "@/lib/cardSize";

export type OpponentDamage = {
  id: string;
  name: string;
  amount: number;
};

const LIFE_DELTA_DISPLAY_MS = 5000;

function useLifeDelta(life: number) {
  const [delta, setDelta] = useState(0);
  const prevLifeRef = useRef(life);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const diff = life - prevLifeRef.current;
    prevLifeRef.current = life;
    if (diff === 0) return;

    setDelta((prev) => prev + diff);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setDelta(0);
      hideTimeoutRef.current = null;
    }, LIFE_DELTA_DISPLAY_MS);
  }, [life]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return delta;
}

// Card content is sized off the card's actual measured pixel footprint
// (via useCardSizeTier), not the viewport — a 4-player quadrant on an iPad
// and a 2-player card on a phone can be nearly the same physical size, and
// CSS container queries can't be used here since this app rotates cards
// with `transform: rotate()`, which container-query size evaluation
// doesn't reliably track in every browser engine.
const LIFE_SIZE = ["text-6xl", "text-7xl", "text-8xl", "text-9xl"];
const OPEN_COUNTERS_SIZE = [
  "px-2 py-1.5 text-sm",
  "px-2 py-1.5 text-sm",
  "px-3 py-2 text-base",
  "px-4 py-2.5 text-lg",
];
const NAME_SIZE = ["text-base", "text-base", "text-lg", "text-xl"];
const TURN_BADGE_SIZE = [
  "px-2 py-0.5 text-[10px]",
  "px-2 py-0.5 text-[10px]",
  "px-2.5 py-1 text-xs",
  "px-3 py-1 text-sm",
];
const ICON_BUTTON_SIZE = [
  "px-2 py-1.5 text-sm",
  "px-2 py-1.5 text-sm",
  "px-3 py-2 text-base",
  "px-4 py-2.5 text-lg",
];
const REVIVE_DEAD_SIZE = [
  "px-2 py-1 text-xs",
  "px-2 py-1 text-xs",
  "px-3 py-1.5 text-sm",
  "px-4 py-1.5 text-base",
];
const STEPPER_SIZE = ["text-4xl", "text-4xl", "text-5xl", "text-6xl"];
const LETHAL_TEXT_SIZE = ["text-xs", "text-xs", "text-sm", "text-base"];

export default function PlayerCard({
  player,
  isLethal,
  isFirst,
  isCurrentTurn,
  opponents,
  poison,
  radiation,
  onChangeLife,
  onOpenElimination,
  onRevive,
  onRotate,
  onOpenCounters,
}: {
  player: Player;
  isLethal: boolean;
  isFirst: boolean;
  isCurrentTurn: boolean;
  opponents: OpponentDamage[];
  poison: number;
  radiation: number;
  onChangeLife: (delta: number) => void;
  onOpenElimination: () => void;
  onRevive: () => void;
  onRotate: () => void;
  onOpenCounters: () => void;
}) {
  const minusHold = useHoldRepeat();
  const plusHold = useHoldRepeat();
  const lifeDelta = useLifeDelta(player.life);
  const tier = useCardSizeTier();

  const lifeColor =
    player.life <= 0
      ? "text-red-500"
      : player.life <= 10
      ? "text-amber-400"
      : "text-neutral-50";

  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-2xl border bg-cover bg-center p-2 transition-opacity ${
        player.eliminated
          ? "border-neutral-800 bg-neutral-900/50 opacity-50"
          : isCurrentTurn
          ? "turn-indicator bg-neutral-900"
          : "border-neutral-800 bg-neutral-900"
      }`}
      style={
        player.artCropUrl
          ? {
              backgroundImage: `url("${player.artCropUrl}")`,
            }
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {lifeDelta !== 0 && (
          <span
            className={`text-lg font-bold tabular-nums drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] ${
              lifeDelta > 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {lifeDelta > 0 ? `+${lifeDelta}` : lifeDelta}
          </span>
        )}
        <span
          className={`text-center ${LIFE_SIZE[tier]} font-black tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] ${lifeColor}`}
        >
          {player.life}
        </span>
      </div>

      {opponents.length > 0 && (
        <div className="mb-1 flex justify-center">
          <div className="relative inline-flex items-center">
            <DamageGrid
              opponents={opponents}
              poison={poison}
              radiation={radiation}
              onOpen={onOpenCounters}
            />

            <button
              onClick={onOpenCounters}
              aria-label="Open counters"
              className={`absolute left-full ml-2 rounded-full bg-neutral-800/80 text-neutral-400 active:scale-95 ${OPEN_COUNTERS_SIZE[tier]}`}
            >
              ⊕
            </button>
          </div>
        </div>
      )}

      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className={`truncate font-semibold text-neutral-300 ${NAME_SIZE[tier]}`}>
            {player.name}
            {isFirst && <span className="ml-1">🎲</span>}
          </p>
          {isCurrentTurn && !player.eliminated && (
            <span
              className={`shrink-0 rounded-full bg-emerald-500/20 font-bold uppercase tracking-wide text-emerald-400 ${TURN_BADGE_SIZE[tier]}`}
            >
              Turn
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onRotate}
            aria-label="Rotate this player's card"
            className={`rounded-full bg-neutral-800 text-neutral-400 active:scale-95 ${ICON_BUTTON_SIZE[tier]}`}
          >
            ⟳
          </button>
          {player.eliminated ? (
            <button
              onClick={onRevive}
              className={`rounded-full bg-neutral-700 font-bold text-neutral-300 active:scale-95 ${REVIVE_DEAD_SIZE[tier]}`}
            >
              Revive
            </button>
          ) : (
            <button
              onClick={onOpenElimination}
              className={`rounded-full font-bold ${REVIVE_DEAD_SIZE[tier]} ${
                isLethal ? "bg-red-600 text-white animate-pulse" : "bg-neutral-800 text-neutral-500"
              }`}
            >
              Dead
            </button>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={player.eliminated}
          onPointerDown={() => {
            playDecrementSound();
            minusHold.start(() => onChangeLife(-10));
          }}
          onPointerUp={() => minusHold.release(() => onChangeLife(-1))}
          onPointerLeave={minusHold.cancel}
          onPointerCancel={minusHold.cancel}
          className={`flex items-center justify-center rounded-xl bg-neutral-800/35 py-2 leading-none font-bold text-red-500 active:scale-95 disabled:opacity-30 ${STEPPER_SIZE[tier]}`}
        >
          <span className="inline-block -translate-y-[3px]">−</span>
        </button>
        <button
          disabled={player.eliminated}
          onPointerDown={() => {
            playIncrementSound();
            plusHold.start(() => onChangeLife(10));
          }}
          onPointerUp={() => plusHold.release(() => onChangeLife(1))}
          onPointerLeave={plusHold.cancel}
          onPointerCancel={plusHold.cancel}
          className={`flex items-center justify-center rounded-xl bg-neutral-800/35 py-2 leading-none font-bold text-emerald-400 active:scale-95 disabled:opacity-30 ${STEPPER_SIZE[tier]}`}
        >
          <span className="inline-block -translate-y-[3px]">+</span>
        </button>
      </div>

      {isLethal && !player.eliminated && (
        <p className={`mt-1 text-center font-semibold text-red-400 ${LETHAL_TEXT_SIZE[tier]}`}>
          Lethal — tap &quot;Out&quot; to eliminate
        </p>
      )}
    </div>
  );
}
