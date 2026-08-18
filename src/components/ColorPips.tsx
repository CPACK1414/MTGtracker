const COLOR_STYLES: Record<string, string> = {
  W: "bg-neutral-100",
  U: "bg-blue-500",
  B: "bg-neutral-500",
  R: "bg-red-500",
  G: "bg-emerald-500",
};

export default function ColorPips({ colors }: { colors?: string | null }) {
  if (!colors) return null;
  const letters = colors
    .toUpperCase()
    .split("")
    .filter((c) => COLOR_STYLES[c]);
  if (letters.length === 0) return null;

  return (
    <span className="inline-flex gap-1">
      {letters.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className={`h-3 w-3 rounded-full ring-1 ring-black/40 ${COLOR_STYLES[c]}`}
        />
      ))}
    </span>
  );
}
