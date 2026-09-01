"use client";

import { useMemo } from "react";

const CONFETTI_COLORS = ["#34d399", "#fbbf24", "#60a5fa", "#f472b6", "#a78bfa", "#f87171"];
const CONFETTI_COUNT = 60;

export default function VictoryFlourish({
  winnerName,
  onMainMenu,
}: {
  winnerName: string;
  onMainMenu: () => void;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.4,
        duration: 1.6 + Math.random() * 0.9,
        width: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-black/70">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.width * 1.6,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s infinite`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <div className="victory-pop relative z-10 flex flex-col items-center gap-2 px-6 text-center">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <div className="trophy-glow pointer-events-none absolute inset-0 rounded-full" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Gold_trophy.png"
            alt=""
            className="relative h-32 w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
          />
        </div>
        <p className="text-2xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
          {winnerName} wins!
        </p>
      </div>
      <button
        onClick={onMainMenu}
        className="relative z-10 mt-8 rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
      >
        Main Menu
      </button>
    </div>
  );
}
