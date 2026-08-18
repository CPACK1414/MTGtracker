"use client";

import Image from "next/image";

export default function CounterBadge({
  value,
  onClick,
  icon,
  emoji,
  label,
}: {
  value: number;
  onClick: () => void;
  icon?: string;
  emoji?: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-2.5 py-1.5 active:scale-95"
    >
      {icon ? (
        <Image
          src={icon}
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 object-contain"
          style={{ filter: "invert(1)" }}
        />
      ) : (
        <span className="text-sm leading-none">{emoji}</span>
      )}
      <span className="text-sm font-bold tabular-nums text-neutral-200">{value}</span>
    </button>
  );
}
