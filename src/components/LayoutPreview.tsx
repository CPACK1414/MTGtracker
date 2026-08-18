"use client";

import { getLayoutTemplate, gridTemplateAreas } from "@/lib/layout";

export default function LayoutPreview({ count }: { count: number }) {
  if (count < 2) return null;

  const template = getLayoutTemplate(count);

  return (
    <div className="mb-4">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Table layout
      </p>
      <div
        className="mx-auto h-28 w-full max-w-xs gap-1"
        style={{
          display: "grid",
          gridTemplateColumns: template.columns,
          gridTemplateRows: template.rows,
          gridTemplateAreas: gridTemplateAreas(template),
        }}
      >
        {template.placements.map((p, i) => (
          <div
            key={i}
            style={{ gridArea: p.area }}
            className="flex items-center justify-center rounded-lg bg-neutral-800"
          >
            <span
              className="text-lg text-neutral-500"
              style={{ display: "inline-block", transform: `rotate(${p.rotation}deg)` }}
            >
              ▲
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-neutral-500">
        Each player&apos;s card faces their seat — tap ⟳ on any card to adjust it during
        the game.
      </p>
    </div>
  );
}
