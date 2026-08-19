"use client";

import { useState } from "react";
import type { Deck } from "@/lib/library";
import { parseCommanderNames } from "@/lib/decklist";
import CommanderInput from "@/components/CommanderInput";

const WUBRG_ORDER = ["W", "U", "B", "R", "G"];

async function fetchCommanderCard(
  cardName: string
): Promise<{ colorIdentity: string[]; artCropUrl: string | null }> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`
    );
    if (!res.ok) return { colorIdentity: [], artCropUrl: null };
    const data = await res.json();
    return {
      colorIdentity: Array.isArray(data.color_identity) ? data.color_identity : [],
      artCropUrl: data.image_uris?.art_crop ?? data.card_faces?.[0]?.image_uris?.art_crop ?? null,
    };
  } catch {
    return { colorIdentity: [], artCropUrl: null };
  }
}

export default function DeckForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Deck;
  onSave: (name: string, commander: string, colors: string, artCropUrl: string | null) => void;
  onCancel: () => void;
}) {
  const [commander, setCommander] = useState(initial?.commander ?? initial?.name ?? "");
  const [colors, setColors] = useState(initial?.colors ?? "");
  const [artCropUrl, setArtCropUrl] = useState<string | null>(initial?.artCropUrl ?? null);
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
      const cards = await Promise.all(commanderNames.map(fetchCommanderCard));
      const union = new Set(cards.flatMap((c) => c.colorIdentity));
      const colorString = WUBRG_ORDER.filter((c) => union.has(c)).join("");
      setCommander(commanderNames.join(" / "));
      setColors(colorString);
      setArtCropUrl(cards[0]?.artCropUrl ?? null);
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-800/60 p-3">
      <CommanderInput
        autoFocus
        value={commander}
        onChange={setCommander}
        onPickColors={setColors}
        onPickArt={setArtCropUrl}
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
          disabled={!commander.trim()}
          onClick={() =>
            commander.trim() &&
            onSave(commander.trim(), commander.trim(), colors.trim(), artCropUrl)
          }
          className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
