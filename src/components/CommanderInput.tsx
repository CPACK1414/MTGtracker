"use client";

import { useEffect, useRef, useState } from "react";

const WUBRG_ORDER = ["W", "U", "B", "R", "G"];

type Suggestion = {
  name: string;
  colorIdentity: string[];
  artCropUrl: string | null;
  flavorText: string | null;
};

type ScryfallCard = {
  name: string;
  color_identity?: string[];
  image_uris?: { art_crop?: string };
  flavor_text?: string;
  card_faces?: { image_uris?: { art_crop?: string }; flavor_text?: string }[];
};

function artCropOf(c: ScryfallCard): string | null {
  return c.image_uris?.art_crop ?? c.card_faces?.[0]?.image_uris?.art_crop ?? null;
}

function flavorTextOf(c: ScryfallCard): string | null {
  return c.flavor_text ?? c.card_faces?.[0]?.flavor_text ?? null;
}

export default function CommanderInput({
  value,
  onChange,
  onPickColors,
  onPickArt,
  onPickFlavorText,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onPickColors: (colors: string) => void;
  onPickArt: (artCropUrl: string | null) => void;
  onPickFlavorText: (flavorText: string | null) => void;
  autoFocus?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function handleChange(next: string) {
    onChange(next);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const query = next.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
            `is:commander ${query}`
          )}&order=name`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = await res.json();
        const cards: ScryfallCard[] = Array.isArray(data.data) ? data.data : [];
        setSuggestions(
          cards.slice(0, 8).map((c) => ({
            name: c.name,
            colorIdentity: c.color_identity ?? [],
            artCropUrl: artCropOf(c),
            flavorText: flavorTextOf(c),
          }))
        );
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setSuggestions([]);
      }
    }, 250);
  }

  function pick(s: Suggestion) {
    onChange(s.name);
    onPickColors(WUBRG_ORDER.filter((c) => s.colorIdentity.includes(c)).join(""));
    onPickArt(s.artCropUrl);
    onPickFlavorText(s.flavorText);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Commander"
        className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg bg-neutral-900 shadow-lg ring-1 ring-neutral-700">
          {suggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className="block w-full px-3 py-2 text-left text-sm text-neutral-200 active:bg-neutral-800"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
