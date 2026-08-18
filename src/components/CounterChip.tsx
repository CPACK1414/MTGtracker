"use client";

export default function CounterChip({
  label,
  value,
  onChange,
  color = "neutral",
  disabled,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
  color?: "neutral" | "poison" | "radiation";
  disabled?: boolean;
}) {
  const valueColor =
    color === "poison"
      ? "text-emerald-400"
      : color === "radiation"
      ? "text-amber-400"
      : "text-neutral-200";

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-neutral-800 pl-1">
      <button
        disabled={disabled}
        onClick={() => onChange(-1)}
        className="px-1.5 py-1.5 text-xs font-bold text-red-400 active:scale-95 disabled:opacity-30"
      >
        −
      </button>
      <span className="max-w-12 truncate text-[10px] font-medium text-neutral-500">{label}</span>
      <span className={`w-5 text-center text-sm font-bold tabular-nums ${valueColor}`}>
        {value}
      </span>
      <button
        disabled={disabled}
        onClick={() => onChange(1)}
        className="px-1.5 py-1.5 text-xs font-bold text-emerald-400 active:scale-95 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
