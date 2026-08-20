"use client";

import { useHoldRepeat } from "@/lib/useHoldRepeat";

export default function CounterChip({
  label,
  value,
  onChange,
  color = "neutral",
  disabled,
  icon,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
  color?: "neutral" | "poison" | "radiation";
  disabled?: boolean;
  icon?: string;
}) {
  const minusHold = useHoldRepeat();
  const plusHold = useHoldRepeat();

  const valueColor =
    color === "poison"
      ? "text-emerald-400"
      : color === "radiation"
      ? "text-amber-400"
      : "text-neutral-200";

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-neutral-800/80 pl-1">
      <button
        disabled={disabled}
        onPointerDown={() => minusHold.start(() => onChange(-10))}
        onPointerUp={() => minusHold.release(() => onChange(-1))}
        onPointerLeave={minusHold.cancel}
        onPointerCancel={minusHold.cancel}
        className="px-1.5 py-1.5 text-xs font-bold text-red-400 active:scale-95 disabled:opacity-30"
      >
        −
      </button>
      {icon ? (
        <span
          aria-label={label}
          className={`inline-block h-3 w-3 shrink-0 bg-current ${valueColor}`}
          style={{
            maskImage: `url(${icon})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskImage: `url(${icon})`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
          }}
        />
      ) : (
        <span className="max-w-12 truncate text-[10px] font-semibold text-neutral-300">{label}</span>
      )}
      <span className={`w-5 text-center text-sm font-bold tabular-nums ${valueColor}`}>
        {value}
      </span>
      <button
        disabled={disabled}
        onPointerDown={() => plusHold.start(() => onChange(10))}
        onPointerUp={() => plusHold.release(() => onChange(1))}
        onPointerLeave={plusHold.cancel}
        onPointerCancel={plusHold.cancel}
        className="px-1.5 py-1.5 text-xs font-bold text-emerald-400 active:scale-95 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
