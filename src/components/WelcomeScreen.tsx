"use client";

import Image from "next/image";

export default function WelcomeScreen({
  activeGameSummary,
  onContinueGame,
  onNewGame,
  onLibrary,
  onStats,
  onGameHistory,
}: {
  activeGameSummary?: string | null;
  onContinueGame?: () => void;
  onNewGame: () => void;
  onLibrary: () => void;
  onStats: () => void;
  onGameHistory: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-10 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MTG Game Tracker</h1>
        <p className="mt-2 text-neutral-400">What do you want to do?</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {activeGameSummary && onContinueGame && (
          <button
            onClick={onContinueGame}
            className="flex items-center gap-3 rounded-2xl bg-indigo-500 px-5 py-3 text-left shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xl">▶️</span>
            <span>
              <span className="block text-base font-bold text-white">Continue Game</span>
              <span className="block text-xs text-indigo-950/70">{activeGameSummary}</span>
            </span>
          </button>
        )}
        <button
          onClick={onNewGame}
          className="flex items-center gap-4 rounded-2xl bg-emerald-500 px-6 py-5 text-left shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <Image
              src="/mtg-logo.png"
              alt=""
              width={22}
              height={36}
              className="h-9 w-auto object-contain"
            />
          </span>
          <span>
            <span className="block text-lg font-bold text-white">New Game</span>
            <span className="block text-sm text-emerald-950/70">
              Pick players and start a pod
            </span>
          </span>
        </button>

        <button
          onClick={onLibrary}
          className="flex items-center gap-4 rounded-2xl bg-neutral-800 px-6 py-5 text-left active:scale-95"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-3xl">👥</span>
          <span>
            <span className="block text-lg font-bold text-white">Players &amp; Decks</span>
            <span className="block text-sm text-neutral-400">
              Add players, manage deck libraries
            </span>
          </span>
        </button>

        <button
          onClick={onStats}
          className="flex items-center gap-4 rounded-2xl bg-neutral-800 px-6 py-5 text-left active:scale-95"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-3xl">🏆</span>
          <span>
            <span className="block text-lg font-bold text-white">Stats</span>
            <span className="block text-sm text-neutral-400">
              Leaderboards and deck matchups
            </span>
          </span>
        </button>

        <button
          onClick={onGameHistory}
          className="flex items-center gap-4 rounded-2xl bg-neutral-800 px-6 py-5 text-left active:scale-95"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-3xl">📜</span>
          <span>
            <span className="block text-lg font-bold text-white">Game History</span>
            <span className="block text-sm text-neutral-400">
              Browse every game played
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
