"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";

export default function WelcomeScreen({
  activeGameSummary,
  onContinueGame,
  onNewGame,
  onLibrary,
  onStats,
  onGameHistory,
  onTournament,
  liveGamesCount,
  onViewLiveGames,
}: {
  activeGameSummary?: string | null;
  onContinueGame?: () => void;
  onNewGame: () => void;
  onLibrary: () => void;
  onStats: () => void;
  onGameHistory: () => void;
  onTournament: () => void;
  liveGamesCount: number;
  onViewLiveGames: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-10 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MTG Game Tracker</h1>
        <p className="mt-2 text-neutral-400">What do you want to do?</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {liveGamesCount > 0 && (
          <button
            onClick={onViewLiveGames}
            className="flex items-center gap-3 rounded-2xl bg-red-500/15 px-5 py-3 text-left ring-1 ring-red-500/40 active:scale-95"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xl">🔴</span>
            <span>
              <span className="block text-base font-bold text-white">Live Games</span>
              <span className="block text-xs text-red-300/80">
                {liveGamesCount} game{liveGamesCount === 1 ? "" : "s"} in progress — tap to watch
              </span>
            </span>
          </button>
        )}
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
          onClick={onTournament}
          className="flex items-center gap-4 rounded-2xl bg-neutral-800 px-6 py-5 text-left active:scale-95"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-3xl">🏆</span>
          <span>
            <span className="block text-lg font-bold text-white">Tournament</span>
            <span className="block text-sm text-neutral-400">
              Bracket play across multiple phones
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
          <span className="flex w-9 shrink-0 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Gold_trophy.png" alt="" className="h-14 w-auto" />
          </span>
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

      <a href="/live" target="_blank" rel="noreferrer" className="text-xs text-neutral-600 underline">
        Live Games link (for a TV or kiosk display)
      </a>
      <button
        onClick={() => signOut({ redirectTo: "/signin" })}
        className="text-xs text-neutral-600 underline"
      >
        Sign out
      </button>
    </div>
  );
}
