"use client";

import { useState } from "react";
import type { Deck } from "@/lib/library";
import CommanderInput from "@/components/CommanderInput";

export default function DeckForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Deck;
  onSave: (
    name: string,
    commander: string,
    colors: string,
    artCropUrl: string | null,
    flavorText: string | null
  ) => void;
  onCancel: () => void;
}) {
  const [commander, setCommander] = useState(initial?.commander ?? initial?.name ?? "");
  const [colors, setColors] = useState(initial?.colors ?? "");
  const [artCropUrl, setArtCropUrl] = useState<string | null>(initial?.artCropUrl ?? null);
  const [flavorText, setFlavorText] = useState<string | null>(initial?.flavorText ?? null);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-800/60 p-3">
      <CommanderInput
        autoFocus
        value={commander}
        onChange={setCommander}
        onPickColors={setColors}
        onPickArt={setArtCropUrl}
        onPickFlavorText={setFlavorText}
      />
      <input
        value={colors}
        onChange={(e) => setColors(e.target.value.toUpperCase())}
        placeholder="Colors, e.g. WUBRG (optional)"
        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
      />

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg bg-neutral-700 py-2 text-sm font-semibold text-neutral-300 active:scale-95"
        >
          Cancel
        </button>
        <button
          disabled={!commander.trim()}
          onClick={() =>
            commander.trim() &&
            onSave(commander.trim(), commander.trim(), colors.trim(), artCropUrl, flavorText)
          }
          className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
