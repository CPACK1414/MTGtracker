"use client";

import { useState } from "react";
import { MAX_POD_SIZE, MIN_POD_SIZE } from "@/lib/types";

export default function PodSetup({
  onStart,
}: {
  onStart: (podSize: number) => void;
}) {
  const [podSize, setPodSize] = useState(4);
  const sizes = Array.from(
    { length: MAX_POD_SIZE - MIN_POD_SIZE + 1 },
    (_, i) => i + MIN_POD_SIZE
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-10 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Commander Life Tracker
        </h1>
        <p className="mt-2 text-neutral-400">
          Pick your pod size to start a game
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-4 gap-3">
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => setPodSize(size)}
            className={`aspect-square rounded-2xl text-2xl font-bold transition-colors active:scale-95 ${
              podSize === size
                ? "bg-indigo-500 text-white"
                : "bg-neutral-800 text-neutral-200"
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      <button
        onClick={() => onStart(podSize)}
        className="w-full max-w-sm rounded-2xl bg-emerald-500 px-8 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
      >
        Start Game
      </button>
    </div>
  );
}
