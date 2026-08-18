"use client";

import { useState } from "react";
import type { Deck } from "@/lib/library";

export default function DeckForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Deck;
  onSave: (name: string, commander: string, colors: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [commander, setCommander] = useState(initial?.commander ?? "");
  const [colors, setColors] = useState(initial?.colors ?? "");

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-800/60 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Deck name"
        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
      />
      <input
        value={commander}
        onChange={(e) => setCommander(e.target.value)}
        placeholder="Commander (optional)"
        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
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
          disabled={!name.trim()}
          onClick={() => name.trim() && onSave(name.trim(), commander.trim(), colors.trim())}
          className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
