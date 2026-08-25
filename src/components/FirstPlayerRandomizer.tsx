"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";

export default function FirstPlayerRandomizer({
  players,
  onClose,
  onPicked,
  closeLabel = "Done",
}: {
  players: Player[];
  onClose: () => void;
  onPicked: (id: string) => void;
  closeLabel?: string;
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const pool = players;
    let ticks = 0;
    const totalTicks = 18 + Math.floor(Math.random() * 6);
    let delay = 70;

    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      setHighlightIndex((i) => (i + 1) % pool.length);
      ticks += 1;
      if (ticks >= totalTicks) {
        const finalIndex = Math.floor(Math.random() * pool.length);
        setHighlightIndex(finalIndex);
        setSettled(true);
        onPicked(pool[finalIndex].id);
        return;
      }
      delay = delay * 1.08;
      timer = setTimeout(step, delay);
    };

    timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/90 px-6 text-center">
      <p className="text-sm uppercase tracking-widest text-neutral-400">
        {settled ? "Goes first" : "Rolling..."}
      </p>
      <p
        className={`text-4xl font-black transition-transform ${
          settled ? "scale-110 text-emerald-400" : "text-white"
        }`}
      >
        {players[highlightIndex]?.name}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {players.map((p, i) => (
          <span
            key={p.id}
            className={`rounded-full px-3 py-1 text-sm ${
              i === highlightIndex
                ? "bg-emerald-500 text-white"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {p.name}
          </span>
        ))}
      </div>
      {settled && (
        <button
          onClick={onClose}
          className="mt-4 rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-bold text-white active:scale-95"
        >
          {closeLabel}
        </button>
      )}
    </div>
  );
}
