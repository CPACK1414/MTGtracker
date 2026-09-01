"use client";

import { useEffect, useState } from "react";
import { getLiveGames, type LiveGameView } from "@/app/liveGameActions";
import LiveSnapshotCard from "@/components/LiveSnapshotCard";

const POLL_MS = 20000;

export default function LiveGamesScreen({
  initial,
  onBack,
}: {
  initial: LiveGameView[];
  onBack: () => void;
}) {
  const [games, setGames] = useState(initial);

  useEffect(() => {
    const interval = setInterval(() => {
      getLiveGames().then(setGames);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
          ← Back
        </button>
        <h1 className="text-base font-bold text-white">Live Games</h1>
        <span className="w-12" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {games.length === 0 ? (
          <p className="mt-6 text-center text-sm text-neutral-500">No games in progress right now.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {games.map((g) => (
              <LiveSnapshotCard
                key={g.id}
                title={g.snapshot.players.map((p) => p.name).join(", ")}
                snapshot={g.snapshot}
              />
            ))}
          </div>
        )}
        <p className="mt-6 text-center text-xs text-neutral-600">Updates every 20 seconds</p>
        <a
          href="/live"
          target="_blank"
          rel="noreferrer"
          className="mt-4 block text-center text-xs text-indigo-400 underline"
        >
          📺 Open TV / kiosk display
        </a>
      </div>
    </div>
  );
}
