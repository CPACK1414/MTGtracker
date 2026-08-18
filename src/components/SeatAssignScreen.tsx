"use client";

import { useState } from "react";
import { getLayoutTemplate, gridTemplateAreas } from "@/lib/layout";
import type { PodSelection } from "@/lib/types";

export default function SeatAssignScreen({
  selections,
  onBack,
  onStart,
}: {
  selections: PodSelection[];
  onBack: () => void;
  onStart: (ordered: PodSelection[]) => void;
}) {
  const template = getLayoutTemplate(selections.length);
  const [seatPlayerIds, setSeatPlayerIds] = useState<(string | null)[]>(() =>
    selections.map(() => null)
  );
  const sortedSelections = [...selections].sort((a, b) => a.name.localeCompare(b.name));

  function assign(seatIndex: number, profileId: string) {
    setSeatPlayerIds((prev) => {
      const next = [...prev];
      const otherSeatIndex = next.indexOf(profileId);
      if (otherSeatIndex !== -1 && otherSeatIndex !== seatIndex) {
        // Swap: whoever was in the target seat takes this seat's old occupant.
        next[otherSeatIndex] = next[seatIndex];
      }
      next[seatIndex] = profileId;
      return next;
    });
  }

  function clearSeat(seatIndex: number) {
    setSeatPlayerIds((prev) => {
      const next = [...prev];
      next[seatIndex] = null;
      return next;
    });
  }

  const allSeated = seatPlayerIds.every((id) => id !== null);

  function handleStart() {
    if (!allSeated) return;
    const ordered = seatPlayerIds.map((id) => selections.find((s) => s.profileId === id)!);
    onStart(ordered);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
          ← Back
        </button>
        <h1 className="text-base font-bold text-white">Choose Seats</h1>
        <span className="w-12" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-6 text-center text-sm text-neutral-400">
          Assign who sits where so everyone can read their own card
        </p>

        <div
          className="mx-auto grid w-full max-w-xs gap-3"
          style={{
            display: "grid",
            gridTemplateColumns: template.columns,
            gridTemplateRows: template.rows,
            gridTemplateAreas: gridTemplateAreas(template),
            minHeight: 280,
          }}
        >
          {template.placements.map((placement, i) => (
            <div
              key={i}
              style={{ gridArea: placement.area }}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-neutral-800 p-3"
            >
              <span
                className="text-xl text-neutral-500"
                style={{ display: "inline-block", transform: `rotate(${(placement.rotation + 180) % 360}deg)` }}
              >
                ▲
              </span>
              <div className="flex w-full items-center gap-1">
                <select
                  value={seatPlayerIds[i] ?? ""}
                  onChange={(e) => assign(i, e.target.value)}
                  className={`w-full min-w-0 rounded-lg px-2 py-2 text-center text-sm font-semibold outline-none ${
                    seatPlayerIds[i] ? "bg-neutral-900 text-white" : "bg-neutral-900/50 text-neutral-500"
                  }`}
                >
                  <option value="" disabled>
                    Choose player
                  </option>
                  {sortedSelections.map((s) => (
                    <option key={s.profileId} value={s.profileId}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {seatPlayerIds[i] && (
                  <button
                    onClick={() => clearSeat(i)}
                    aria-label="Clear this seat"
                    className="shrink-0 rounded-lg bg-neutral-900 px-2 py-2 text-sm font-bold text-neutral-500 active:scale-95"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-800 px-4 py-4">
        <button
          disabled={!allSeated}
          onClick={handleStart}
          className="w-full rounded-2xl bg-emerald-500 px-8 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-30 disabled:shadow-none"
        >
          {allSeated ? "Start Game" : "Seat everyone to start"}
        </button>
      </div>
    </div>
  );
}
