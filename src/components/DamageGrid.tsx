"use client";

import Image from "next/image";
import type { OpponentDamage } from "@/components/PlayerCard";

export default function DamageGrid({
  opponents,
  poison,
  radiation,
  onOpen,
}: {
  opponents: OpponentDamage[];
  poison: number;
  radiation: number;
  onOpen: () => void;
}) {
  const totalItems = opponents.length + 2;
  const isLastOdd = totalItems % 2 === 1;

  return (
    <button
      onClick={onOpen}
      className="mx-auto grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-xl bg-neutral-800 px-2 py-1.5 active:scale-95"
    >
      {opponents.map((o) => (
        <span key={o.id} className="text-[10px] font-semibold tabular-nums text-neutral-300">
          {o.name.slice(0, 3)} <span className="font-bold text-white">{o.amount}</span>
        </span>
      ))}
      <span className="flex items-center gap-1 text-[10px] font-semibold tabular-nums text-neutral-300">
        <Image
          src="/poison-counter.png"
          alt=""
          width={10}
          height={10}
          className="h-2.5 w-2.5 object-contain"
          style={{ filter: "invert(1)" }}
        />
        <span className="font-bold text-white">{poison}</span>
      </span>
      <span
        className={`flex items-center gap-1 text-[10px] font-semibold tabular-nums text-neutral-300 ${
          isLastOdd ? "col-span-2 justify-self-center" : ""
        }`}
      >
        <span className="text-xs leading-none">☢</span>
        <span className="font-bold text-white">{radiation}</span>
      </span>
    </button>
  );
}
