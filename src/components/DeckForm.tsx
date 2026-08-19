"use client";

import { useState } from "react";
import type { Deck } from "@/lib/library";
import { parseCommanderNames } from "@/lib/decklist";

const WUBRG_ORDER = ["W", "U", "B", "R", "G"];

async function fetchColorIdentity(cardName: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.color_identity) ? data.color_identity : [];
  } catch {
    return [];
  }
}

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
  const [decklistText, setDecklistText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleParse() {
    const commanderNames = parseCommanderNames(decklistText);
    if (commanderNames.length === 0) {
      setParseError("Couldn't find a Commander section in that text.");
      return;
    }
    setParsing(true);
    setParseError(null);
    try {
      const identities = await Promise.all(commanderNames.map(fetchColorIdentity));
      const union = new Set(identities.flat());
      const colorString = WUBRG_ORDER.filter((c) => union.has(c)).join("");
      setCommander(commanderNames.join(" / "));
      setColors(colorString);
    } finally {
      setParsing(false);
    }
  }

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

      <details className="rounded-lg bg-neutral-900 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-neutral-400">
          Paste from Moxfield instead
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[11px] text-neutral-500">
            On Moxfield: deck page → Export → Text, then paste the whole thing here.
          </p>
          <textarea
            value={decklistText}
            onChange={(e) => setDecklistText(e.target.value)}
            placeholder={"Commander\n1 Meren of Clan Nel Toth\n\nDeck\n1 Sol Ring\n..."}
            rows={4}
            className="rounded-lg bg-neutral-950 px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600"
          />
          {parseError && <p className="text-xs text-red-400">{parseError}</p>}
          <button
            type="button"
            onClick={handleParse}
            disabled={!decklistText.trim() || parsing}
            className="rounded-lg bg-neutral-700 py-2 text-xs font-semibold text-white active:scale-95 disabled:opacity-40"
          >
            {parsing ? "Parsing…" : "Fill commander & colors from decklist"}
          </button>
        </div>
      </details>

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
