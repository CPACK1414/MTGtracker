"use client";

import { useEffect, useState } from "react";
import { getLiveGames, type LiveGameView } from "@/app/liveGameActions";
import LiveSnapshotCard from "@/components/LiveSnapshotCard";

const POLL_MS = 20000;

// A standalone, self-refreshing board meant to be left open on a TV or
// tablet near the table — no navigation, no back button, nothing to
// interact with. Point a browser at this URL once and forget about it.
export default function LiveGamesBoardScreen({ initial }: { initial: LiveGameView[] }) {
  const [games, setGames] = useState(initial);

  useEffect(() => {
    const interval = setInterval(() => {
      getLiveGames().then(setGames);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 px-8 py-10">
      <h1 className="mb-8 text-center text-4xl font-bold text-white">🔴 Live Games</h1>

      {games.length === 0 ? (
        <p className="mt-16 text-center text-2xl text-neutral-500">No games in progress right now.</p>
      ) : (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
          {games.map((g) => (
            <LiveSnapshotCard
              key={g.id}
              title={g.snapshot.players.map((p) => p.name).join(", ")}
              snapshot={g.snapshot}
              size="large"
            />
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-sm text-neutral-600">Updates every 20 seconds</p>
    </div>
  );
}
