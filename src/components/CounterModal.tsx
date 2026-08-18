"use client";

import Image from "next/image";
import type { OpponentDamage } from "@/components/PlayerCard";

function StepperRow({
  label,
  value,
  onChange,
  icon,
  emoji,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
  icon?: string;
  emoji?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-neutral-800/60 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {icon && (
          <Image
            src={icon}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] shrink-0 object-contain"
            style={{ filter: "invert(1)" }}
          />
        )}
        {emoji && <span className="shrink-0 text-lg leading-none">{emoji}</span>}
        <span className="truncate font-semibold text-neutral-200">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={() => onChange(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-lg font-bold text-red-400 active:scale-95"
        >
          −
        </button>
        <span className="w-6 text-center text-xl font-black tabular-nums text-white">{value}</span>
        <button
          onClick={() => onChange(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-lg font-bold text-emerald-400 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function CounterModal({
  playerName,
  opponents,
  poison,
  radiation,
  onChangeCommanderDamage,
  onChangePoison,
  onChangeRadiation,
  onClose,
}: {
  playerName: string;
  opponents: OpponentDamage[];
  poison: number;
  radiation: number;
  onChangeCommanderDamage: (fromOpponentId: string, delta: number) => void;
  onChangePoison: (delta: number) => void;
  onChangeRadiation: (delta: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 sm:items-center sm:justify-center">
      <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-neutral-900 p-5 sm:w-full sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{playerName}&apos;s Counters</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95"
          >
            Done
          </button>
        </div>

        {opponents.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Commander damage taken
            </p>
            <div className="flex flex-col gap-2">
              {opponents.map((o) => (
                <StepperRow
                  key={o.id}
                  label={o.name}
                  value={o.amount}
                  onChange={(delta) => onChangeCommanderDamage(o.id, delta)}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Other counters
          </p>
          <div className="flex flex-col gap-2">
            <StepperRow
              label="Poison"
              icon="/poison-counter.png"
              value={poison}
              onChange={onChangePoison}
            />
            <StepperRow label="Radiation" emoji="☢" value={radiation} onChange={onChangeRadiation} />
          </div>
        </div>
      </div>
    </div>
  );
}
