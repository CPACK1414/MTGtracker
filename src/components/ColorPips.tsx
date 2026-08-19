import Image from "next/image";

const COLOR_ICONS: Record<string, string> = {
  W: "/mana-white.png",
  U: "/mana-blue.png",
  B: "/mana-black.png",
  R: "/mana-red.png",
  G: "/mana-green.png",
};

export default function ColorPips({ colors }: { colors?: string | null }) {
  if (!colors) return null;
  const letters = colors
    .toUpperCase()
    .split("")
    .filter((c) => COLOR_ICONS[c]);
  if (letters.length === 0) return null;

  return (
    <span className="inline-flex gap-1">
      {letters.map((c, i) => (
        <Image
          key={`${c}-${i}`}
          src={COLOR_ICONS[c]}
          alt={c}
          width={14}
          height={14}
          className="h-3.5 w-3.5 shrink-0 rounded-full object-contain"
        />
      ))}
    </span>
  );
}
