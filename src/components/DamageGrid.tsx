"use client";

import type { OpponentDamage } from "@/components/PlayerCard";
import type { QuadrantBucket } from "@/lib/layout";

function Cell({ items }: { items: OpponentDamage[] }) {
  if (items.length === 0) return <div className="min-w-8" />;
  return (
    <div className="flex min-w-8 flex-col items-center gap-0.5">
      {items.map((o) => (
        <span key={o.id} className="text-[10px] font-semibold tabular-nums text-neutral-300">
          {o.name.slice(0, 3)} <span className="font-bold text-white">{o.amount}</span>
        </span>
      ))}
    </div>
  );
}

export default function DamageGrid({
  buckets,
  onOpen,
}: {
  buckets: Record<QuadrantBucket, OpponentDamage[]>;
  onOpen: () => void;
}) {
  const hasTop = buckets.topLeft.length > 0 || buckets.topRight.length > 0;
  const hasBottom = buckets.bottomLeft.length > 0 || buckets.bottomRight.length > 0;
  if (!hasTop && !hasBottom) return null;

  return (
    <button
      onClick={onOpen}
      className="mx-auto flex flex-col gap-1 rounded-xl bg-neutral-800 px-2 py-1.5 active:scale-95"
    >
      {hasTop && (
        <div className="flex items-center justify-between gap-3">
          <Cell items={buckets.topLeft} />
          <Cell items={buckets.topRight} />
        </div>
      )}
      {hasBottom && (
        <div className="flex items-center justify-between gap-3">
          <Cell items={buckets.bottomLeft} />
          <Cell items={buckets.bottomRight} />
        </div>
      )}
    </button>
  );
}
