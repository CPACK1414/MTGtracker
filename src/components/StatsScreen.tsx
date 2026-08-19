"use client";

import { useEffect, useState } from "react";
import { getReportingData, type ReportingData } from "@/app/actions";
import { MAX_POD_SIZE, MIN_POD_SIZE } from "@/lib/types";
import PlayerHistoryModal from "@/components/PlayerHistoryModal";

type Tab = "players" | "decks" | "matchups";

const POD_SIZES = Array.from(
  { length: MAX_POD_SIZE - MIN_POD_SIZE + 1 },
  (_, i) => i + MIN_POD_SIZE
);

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<ReportingData | null>(null);
  const [tab, setTab] = useState<Tab>("players");
  const [podSizeFilter, setPodSizeFilter] = useState<number | null>(null);
  const [historyPlayer, setHistoryPlayer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    getReportingData(podSizeFilter).then(setData);
  }, [podSizeFilter]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button onClick={onBack} className="text-sm font-semibold text-neutral-400">
          ← Back
        </button>
        <h1 className="text-base font-bold text-white">Stats</h1>
        <span className="w-12" />
      </header>

      <div className="flex gap-1 overflow-x-auto px-4 pt-3">
        <button
          onClick={() => setPodSizeFilter(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
            podSizeFilter === null ? "bg-emerald-500 text-white" : "bg-neutral-900 text-neutral-400"
          }`}
        >
          All pod sizes
        </button>
        {POD_SIZES.map((size) => (
          <button
            key={size}
            onClick={() => setPodSizeFilter(size)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              podSizeFilter === size ? "bg-emerald-500 text-white" : "bg-neutral-900 text-neutral-400"
            }`}
          >
            {size} players
          </button>
        ))}
      </div>

      <div className="flex gap-1 px-4 py-3">
        {(["players", "decks", "matchups"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize ${
              tab === t ? "bg-indigo-500 text-white" : "bg-neutral-900 text-neutral-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {!data ? (
          <p className="mt-10 text-center text-sm text-neutral-500">Loading…</p>
        ) : tab === "players" ? (
          <PlayerLeaderboard
            players={data.players}
            podSizeFilter={podSizeFilter}
            onSelectPlayer={(id, name) => setHistoryPlayer({ id, name })}
          />
        ) : tab === "decks" ? (
          <DeckLeaderboard decks={data.decks} podSizeFilter={podSizeFilter} />
        ) : (
          <MatchupTable matchups={data.matchups} podSizeFilter={podSizeFilter} />
        )}
      </div>

      {historyPlayer && (
        <PlayerHistoryModal
          playerId={historyPlayer.id}
          playerName={historyPlayer.name}
          onClose={() => setHistoryPlayer(null)}
        />
      )}
    </div>
  );
}

function PlayerLeaderboard({
  players,
  podSizeFilter,
  onSelectPlayer,
}: {
  players: ReportingData["players"];
  podSizeFilter: number | null;
  onSelectPlayer: (id: string, name: string) => void;
}) {
  if (players.length === 0) {
    return (
      <EmptyState
        text={
          podSizeFilter
            ? `No ${podSizeFilter}-player games logged yet.`
            : "No games logged yet — finish a game to see stats here."
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {players.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelectPlayer(p.id, p.name)}
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-left active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="w-5 text-sm font-bold text-neutral-500">{i + 1}</span>
            <div>
              <p className="font-semibold text-white">{p.name}</p>
              <p className="text-xs text-neutral-500">
                {p.wins}W – {p.gamesPlayed - p.wins}L · {p.gamesPlayed} game
                {p.gamesPlayed === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <span className="text-lg font-black tabular-nums text-emerald-400">
            {pct(p.winRate)}
          </span>
        </button>
      ))}
    </div>
  );
}

function DeckLeaderboard({
  decks,
  podSizeFilter,
}: {
  decks: ReportingData["decks"];
  podSizeFilter: number | null;
}) {
  if (decks.length === 0) {
    return (
      <EmptyState
        text={
          podSizeFilter
            ? `No decks played in a ${podSizeFilter}-player game yet.`
            : "No decks have been played in a finished game yet."
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {decks.map((d, i) => (
        <div
          key={d.id}
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="w-5 text-sm font-bold text-neutral-500">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{d.name}</p>
              <p className="truncate text-xs text-neutral-500">
                {d.playerName}
                {d.commander ? ` · ${d.commander}` : ""}
              </p>
              <p className="text-xs text-neutral-500">
                {d.wins}W – {d.gamesPlayed - d.wins}L · {d.gamesPlayed} game
                {d.gamesPlayed === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-lg font-black tabular-nums text-emerald-400">
            {pct(d.winRate)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MatchupTable({
  matchups,
  podSizeFilter,
}: {
  matchups: ReportingData["matchups"];
  podSizeFilter: number | null;
}) {
  if (matchups.length === 0) {
    return (
      <EmptyState
        text={
          podSizeFilter
            ? `No deck-vs-deck matchups in ${podSizeFilter}-player games yet.`
            : "No deck-vs-deck matchups yet — needs a finished game where at least two players brought decks."
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {matchups.map((m) => {
        const total = m.aWins + m.bWins;
        const aPct = total ? (m.aWins / total) * 100 : 50;
        return (
          <div
            key={`${m.deckAId}-${m.deckBId}`}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{m.deckAName}</p>
                <p className="truncate text-xs text-neutral-500">{m.deckAPlayerName}</p>
              </div>
              <span className="shrink-0 font-black tabular-nums text-neutral-300">
                {m.aWins} – {m.bWins}
              </span>
              <div className="min-w-0 text-right">
                <p className="truncate font-semibold text-white">{m.deckBName}</p>
                <p className="truncate text-xs text-neutral-500">{m.deckBPlayerName}</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${aPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-10 text-center text-sm text-neutral-500">{text}</p>;
}
