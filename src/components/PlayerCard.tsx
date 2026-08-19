"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Player } from "@/lib/types";
import CounterChip from "@/components/CounterChip";
import DamageGrid from "@/components/DamageGrid";

export type OpponentDamage = {
  id: string;
  name: string;
  amount: number;
};

const HOLD_DELAY_MS = 450;
const HOLD_INTERVAL_MS = 500;

function useHoldRepeat() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function clearTimers() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }

  function start(onRepeat: () => void) {
    repeatingRef.current = false;
    timeoutRef.current = setTimeout(() => {
      repeatingRef.current = true;
      intervalRef.current = setInterval(onRepeat, HOLD_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }

  function release(onTap: () => void) {
    const wasRepeating = repeatingRef.current;
    clearTimers();
    repeatingRef.current = false;
    if (!wasRepeating) onTap();
  }

  function cancel() {
    clearTimers();
    repeatingRef.current = false;
  }

  return { start, release, cancel };
}

export default function PlayerCard({
  player,
  isLethal,
  isFirst,
  singleOpponent,
  groupOpponents,
  poison,
  radiation,
  onChangeLife,
  onMarkDead,
  onScoop,
  onRevive,
  onRotate,
  onChangeCommanderDamage,
  onOpenCounters,
}: {
  player: Player;
  isLethal: boolean;
  isFirst: boolean;
  singleOpponent?: OpponentDamage;
  groupOpponents?: OpponentDamage[];
  poison: number;
  radiation: number;
  onChangeLife: (delta: number) => void;
  onMarkDead: () => void;
  onScoop: () => void;
  onRevive: () => void;
  onRotate: () => void;
  onChangeCommanderDamage: (fromOpponentId: string, delta: number) => void;
  onOpenCounters: () => void;
}) {
  const [confirmingElimination, setConfirmingElimination] = useState(false);
  const minusHold = useHoldRepeat();
  const plusHold = useHoldRepeat();

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
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center text-center text-6xl font-black tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] ${lifeColor}`}
      >
        {player.life}
      </div>

      {singleOpponent && (
        <div className="mb-1 flex items-center justify-center gap-2">
          <CounterChip
            label={singleOpponent.name}
            value={singleOpponent.amount}
            disabled={player.eliminated}
            onChange={(delta) => onChangeCommanderDamage(singleOpponent.id, delta)}
          />
          {(poison > 0 || radiation > 0) && (
            <button
              onClick={onOpenCounters}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-800 px-2 py-1.5 active:scale-95"
            >
              {poison > 0 && (
                <span className="flex items-center gap-1">
                  <Image
                    src="/poison-counter.png"
                    alt=""
                    width={10}
                    height={10}
                    className="h-2.5 w-2.5 object-contain"
                    style={{ filter: "invert(1)" }}
                  />
                  <span className="text-xs font-bold tabular-nums text-white">{poison}</span>
                </span>
              )}
              {radiation > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-xs leading-none">☢</span>
                  <span className="text-xs font-bold tabular-nums text-white">{radiation}</span>
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {!singleOpponent && groupOpponents && (
        <div className="mb-1 flex justify-center">
          <DamageGrid
            opponents={groupOpponents}
            poison={poison}
            radiation={radiation}
            onOpen={onOpenCounters}
          />
        </div>
      )}

      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-neutral-300">
            {player.name}
            {isFirst && <span className="ml-1">🎲</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onOpenCounters}
            aria-label="Open counters"
            className="rounded-full bg-neutral-800 px-2 py-1.5 text-sm text-neutral-400 active:scale-95"
          >
            ⊕
          </button>
          <button
            onClick={onRotate}
            aria-label="Rotate this player's card"
            className="rounded-full bg-neutral-800 px-2 py-1.5 text-sm text-neutral-400 active:scale-95"
          >
            ⟳
          </button>
          {player.eliminated ? (
            <button
              onClick={onRevive}
              className="rounded-full bg-neutral-700 px-2 py-1 text-xs font-bold text-neutral-300 active:scale-95"
            >
              Revive
            </button>
          ) : confirmingElimination ? (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setConfirmingElimination(false);
                  onMarkDead();
                }}
                className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold text-white active:scale-95"
              >
                Dead
              </button>
              <button
                onClick={() => {
                  setConfirmingElimination(false);
                  onScoop();
                }}
                className="rounded-full bg-neutral-700 px-2 py-1 text-[10px] font-bold text-neutral-300 active:scale-95"
              >
                Scoop
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingElimination(true)}
              className={`rounded-full px-2 py-1 text-xs font-bold ${
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
          onPointerDown={() => minusHold.start(() => onChangeLife(-10))}
          onPointerUp={() => minusHold.release(() => onChangeLife(-1))}
          onPointerLeave={minusHold.cancel}
          onPointerCancel={minusHold.cancel}
          className="rounded-xl bg-neutral-800 py-2 text-2xl font-bold text-red-400 active:scale-95 disabled:opacity-30"
        >
          −
        </button>
        <button
          disabled={player.eliminated}
          onPointerDown={() => plusHold.start(() => onChangeLife(10))}
          onPointerUp={() => plusHold.release(() => onChangeLife(1))}
          onPointerLeave={plusHold.cancel}
          onPointerCancel={plusHold.cancel}
          className="rounded-xl bg-neutral-800 py-2 text-2xl font-bold text-emerald-400 active:scale-95 disabled:opacity-30"
        >
          +
        </button>
      </div>

      {isLethal && !player.eliminated && (
        <p className="mt-1 text-center text-xs font-semibold text-red-400">
          Lethal — tap &quot;Out&quot; to eliminate
        </p>
      )}
    </div>
  );
}
