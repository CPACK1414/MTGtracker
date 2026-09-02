const MANA_COLORS = ["white", "blue", "black", "red", "green"] as const;
const SLOT_SECONDS = 1.5; // 1s fully visible + 0.25s fade in + 0.25s fade out
const CYCLE_SECONDS = SLOT_SECONDS * MANA_COLORS.length;

// Pure CSS — no client JS needed. Each symbol shares one keyframe timeline
// but starts at a different (negative) offset into it, so only one is ever
// in its "bright" window at a time as they hand off to each other.
export default function ManaCycle() {
  return (
    <div className="relative h-28 w-28 sm:h-36 sm:w-36">
      {MANA_COLORS.map((color, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={color}
          src={`/mana-${color}.png`}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            opacity: 0,
            animationName: "mana-cycle",
            animationDuration: `${CYCLE_SECONDS}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-in-out",
            animationDelay: `${-(i * SLOT_SECONDS)}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes mana-cycle {
          0% { opacity: 0; }
          ${((0.25 / CYCLE_SECONDS) * 100).toFixed(2)}% { opacity: 1; }
          ${((1.25 / CYCLE_SECONDS) * 100).toFixed(2)}% { opacity: 1; }
          ${((SLOT_SECONDS / CYCLE_SECONDS) * 100).toFixed(2)}% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
