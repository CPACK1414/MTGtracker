"use client";

import type { OpponentDamage } from "@/components/PlayerCard";

export default function DamageGrid({
  opponents,
  onOpen,
}: {
  opponents: OpponentDamage[];
  onOpen: () => void;
}) {
  if (opponents.length === 0) return null;

  const isOdd = opponents.length % 2 === 1;

  return (
    <button
      onClick={onOpen}
      className="mx-auto grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-xl bg-neutral-800 px-2 py-1.5 active:scale-95"
    >
      {opponents.map((o, i) => {
        const isLastOdd = isOdd && i === opponents.length - 1;
        return (
          <span
            key={o.id}
            className={`text-[10px] font-semibold tabular-nums text-neutral-300 ${
              isLastOdd ? "col-span-2 justify-self-center" : ""
            }`}
          >
            {o.name.slice(0, 3)} <span className="font-bold text-white">{o.amount}</span>
          </span>
        );
      })}
    </button>
  );
}
