"use client";

import Image from "next/image";
import type { OpponentDamage } from "@/components/PlayerCard";
import { useCardSizeTier } from "@/lib/cardSize";

const BADGE_TEXT_SIZE = ["text-[10px]", "text-xs", "text-sm", "text-base"];
const RADIATION_ICON_SIZE = ["text-xs", "text-xs", "text-sm", "text-base"];
const CONTAINER_SIZE = [
  "gap-x-3 px-2 py-1.5",
  "gap-x-3 px-2 py-1.5",
  "gap-x-4 px-3 py-2",
  "gap-x-4 px-4 py-2.5",
];

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
  const tier = useCardSizeTier();
  const badgeTextClass = `${BADGE_TEXT_SIZE[tier]} font-semibold tabular-nums text-neutral-300`;

  const items: { key: string; node: React.ReactNode }[] = [
    ...opponents.map((o) => ({
      key: o.id,
      node: (
        <span className={badgeTextClass}>
          {o.name.slice(0, 3)} <span className="font-bold text-white">{o.amount}</span>
        </span>
      ),
    })),
    ...(poison > 0
      ? [
          {
            key: "poison",
            node: (
              <span className={`flex items-center gap-1 ${badgeTextClass}`}>
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
              <span className={`flex items-center gap-1 ${badgeTextClass}`}>
                <span className={`leading-none ${RADIATION_ICON_SIZE[tier]}`}>☢</span>
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
      className={`mx-auto grid grid-cols-2 gap-y-0.5 rounded-xl bg-neutral-800/45 active:scale-95 ${CONTAINER_SIZE[tier]}`}
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
