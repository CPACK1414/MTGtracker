"use client";

import RotatableCard from "@/components/RotatableCard";
import { getLayoutTemplate, gridTemplateAreas } from "@/lib/layout";
import type { Player } from "@/lib/types";

export default function ReadyUpScreen({
  players,
  readyPlayerIds,
  onReady,
}: {
  players: Player[];
  readyPlayerIds: Set<string>;
  onReady: (id: string) => void;
}) {
  const layoutTemplate = getLayoutTemplate(players.length);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black">
      <div className="border-b border-neutral-800 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-neutral-300">
          Shuffle up, draw your hand — tap Ready when you&apos;re set
        </p>
      </div>
      <div
        className="flex-1 gap-2 p-2"
        style={{
          display: "grid",
          gridTemplateColumns: layoutTemplate.columns,
          gridTemplateRows: layoutTemplate.rows,
          gridTemplateAreas: gridTemplateAreas(layoutTemplate),
        }}
      >
        {players.map((p, i) => {
          const placement = layoutTemplate.placements[i];
          const ready = readyPlayerIds.has(p.id);
          return (
            <RotatableCard
              key={p.id}
              rotation={placement?.rotation ?? 0}
              style={{ gridArea: placement?.area }}
            >
              <div
                className={`flex h-full w-full flex-col items-center justify-center gap-5 rounded-2xl border p-4 transition-colors ${
                  ready
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-neutral-800 bg-neutral-900"
                }`}
              >
                <p className="text-xl font-bold text-white">{p.name}</p>
                {ready ? (
                  <span className="rounded-full bg-emerald-500/20 px-6 py-3 text-lg font-bold text-emerald-400">
                    ✓ Ready
                  </span>
                ) : (
                  <button
                    onClick={() => onReady(p.id)}
                    className="rounded-2xl bg-emerald-500 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    Ready Up
                  </button>
                )}
              </div>
            </RotatableCard>
          );
        })}
      </div>
    </div>
  );
}
