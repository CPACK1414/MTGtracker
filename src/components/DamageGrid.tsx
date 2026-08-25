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
  const items: { key: string; node: React.ReactNode }[] = [
    ...opponents.map((o) => ({
      key: o.id,
      node: (
        <span className="text-[10px] font-semibold tabular-nums text-neutral-300">
          {o.name.slice(0, 3)} <span className="font-bold text-white">{o.amount}</span>
        </span>
      ),
    })),
    ...(poison > 0
      ? [
          {
            key: "poison",
            node: (
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
            ),
          },
        ]
      : []),
    ...(radiation > 0
      ? [
          {
            key: "radiation",
            node: (
              <span className="flex items-center gap-1 text-[10px] font-semibold tabular-nums text-neutral-300">
                <span className="text-xs leading-none">☢</span>
                <span className="font-bold text-white">{radiation}</span>
              </span>
            ),
          },
        ]
      : []),
  ];

  const isLastOdd = items.length % 2 === 1;

  return (
    <button
      onClick={onOpen}
      className="mx-auto grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-xl bg-neutral-800/45 px-2 py-1.5 active:scale-95"
    >
      {items.map((item, i) => (
        <span
          key={item.key}
          className={isLastOdd && i === items.length - 1 ? "col-span-2 justify-self-center" : ""}
        >
          {item.node}
        </span>
      ))}
    </button>
  );
}
