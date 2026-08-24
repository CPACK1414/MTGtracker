"use client";

import { useEffect, useMemo, useState } from "react";
import { getReportingData, type DateRange, type ReportingData } from "@/app/actions";
import { MAX_POD_SIZE, MIN_POD_SIZE } from "@/lib/types";
import PlayerHistoryModal from "@/components/PlayerHistoryModal";

type Scope = "player" | "deck";
type Mode = "totalWins" | "winRate" | "matchups" | "random";
type TimeRangeKey = "all" | "7d" | "30d" | "90d" | "1y" | "custom";

const SCOPES: { key: Scope; label: string }[] = [
  { key: "player", label: "Player" },
  { key: "deck", label: "Deck" },
];

const MODES: { key: Mode; label: string }[] = [
  { key: "totalWins", label: "Total Wins" },
  { key: "winRate", label: "Win Rate" },
  { key: "matchups", label: "Matchups" },
  { key: "random", label: "Fun Stats" },
];

const POD_SIZES = Array.from(
  { length: MAX_POD_SIZE - MIN_POD_SIZE + 1 },
  (_, i) => i + MIN_POD_SIZE
);

const TIME_RANGES: { key: TimeRangeKey; label: string; days?: number }[] = [
  { key: "all", label: "All time" },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "1y", label: "1 year", days: 365 },
  { key: "custom", label: "Custom" },
];

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

function displayName(name: string, screenName?: string | null) {
  return screenName ? `${name} (${screenName})` : name;
}

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<ReportingData | null>(null);
  const [scope, setScope] = useState<Scope>("player");
  const [mode, setMode] = useState<Mode>("totalWins");
  const [podSizeFilter, setPodSizeFilter] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [historyPlayer, setHistoryPlayer] = useState<{
    id: string;
    name: string;
    screenName: string | null;
  } | null>(null);

  const dateRange: DateRange | null = useMemo(() => {
    if (timeRange === "all") return null;
    if (timeRange === "custom") {
      if (!customFrom || !customTo) return null;
      return {
        from: new Date(`${customFrom}T00:00:00`).toISOString(),
        to: new Date(`${customTo}T23:59:59.999`).toISOString(),
      };
    }
    const days = TIME_RANGES.find((r) => r.key === timeRange)?.days ?? 0;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [timeRange, customFrom, customTo]);

  useEffect(() => {
    if (timeRange === "custom" && !dateRange) return;
    getReportingData(podSizeFilter, dateRange).then(setData);
  }, [podSizeFilter, dateRange, timeRange]);

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

      <div className="flex gap-1 overflow-x-auto px-4 pt-2">
        {TIME_RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setTimeRange(r.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              timeRange === r.key ? "bg-indigo-500 text-white" : "bg-neutral-900 text-neutral-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {timeRange === "custom" && (
        <div className="flex items-center gap-2 px-4 pt-2 text-sm">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2 text-white outline-none"
          />
          <span className="shrink-0 text-neutral-500">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2 text-white outline-none"
          />
        </div>
      )}

      <div className={`flex gap-1 overflow-x-auto px-4 pt-3 ${mode === "random" ? "hidden" : ""}`}>
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              scope === s.key ? "bg-amber-500 text-white" : "bg-neutral-900 text-neutral-400"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto px-4 py-3">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              mode === m.key ? "bg-indigo-500 text-white" : "bg-neutral-900 text-neutral-400"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {!data ? (
          <p className="mt-10 text-center text-sm text-neutral-500">Loading…</p>
        ) : mode === "random" ? (
          <FunStatsView stats={data.funStats} />
        ) : mode === "matchups" ? (
          scope === "player" ? (
            <PlayerMatchupTable matchups={data.playerMatchups} podSizeFilter={podSizeFilter} />
          ) : (
            <DeckMatchupTable matchups={data.deckMatchups} podSizeFilter={podSizeFilter} />
          )
        ) : scope === "player" ? (
          <PlayerLeaderboard
            players={data.players}
            podSizeFilter={podSizeFilter}
            onSelectPlayer={(id, name, screenName) => setHistoryPlayer({ id, name, screenName })}
            metric={mode}
          />
        ) : (
          <DeckLeaderboard decks={data.decks} podSizeFilter={podSizeFilter} metric={mode} />
        )}
      </div>

      {historyPlayer && (
        <PlayerHistoryModal
          playerId={historyPlayer.id}
          playerName={historyPlayer.name}
          playerScreenName={historyPlayer.screenName}
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
  metric,
}: {
  players: ReportingData["players"];
  podSizeFilter: number | null;
  onSelectPlayer: (id: string, name: string, screenName: string | null) => void;
  metric: "totalWins" | "winRate";
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
  const sorted = [...players].sort((a, b) =>
    metric === "totalWins"
      ? b.wins - a.wins || b.winRate - a.winRate
      : b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed
  );
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelectPlayer(p.id, p.name, p.screenName)}
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-left active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="w-5 text-sm font-bold text-neutral-500">{i + 1}</span>
            <div>
              <p className="font-semibold text-white">
                {p.name}
                {p.screenName && (
                  <span className="ml-1 font-normal text-neutral-500">({p.screenName})</span>
                )}
              </p>
              <p className="text-xs text-neutral-500">
                {p.wins}W – {p.gamesPlayed - p.wins}L · {p.gamesPlayed} game
                {p.gamesPlayed === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <span className="text-lg font-black tabular-nums text-emerald-400">
            {metric === "totalWins" ? p.wins : pct(p.winRate)}
          </span>
        </button>
      ))}
    </div>
  );
}

function DeckLeaderboard({
  decks,
  podSizeFilter,
  metric,
}: {
  decks: ReportingData["decks"];
  podSizeFilter: number | null;
  metric: "totalWins" | "winRate";
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
  const sorted = [...decks].sort((a, b) =>
    metric === "totalWins"
      ? b.wins - a.wins || b.winRate - a.winRate
      : b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed
  );
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((d, i) => (
        <div
          key={d.id}
          className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="w-5 text-sm font-bold text-neutral-500">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{d.name}</p>
              <p className="truncate text-xs text-neutral-500">{d.playerName}</p>
              <p className="text-xs text-neutral-500">
                {d.wins}W – {d.gamesPlayed - d.wins}L · {d.gamesPlayed} game
                {d.gamesPlayed === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-lg font-black tabular-nums text-emerald-400">
            {metric === "totalWins" ? d.wins : pct(d.winRate)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DeckMatchupTable({
  matchups,
  podSizeFilter,
}: {
  matchups: ReportingData["deckMatchups"];
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
      {matchups.map((group) => (
        <div
          key={group.key}
          className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {group.gamesPlayed} game{group.gamesPlayed === 1 ? "" : "s"}
          </p>
          <div className="flex flex-col gap-1.5">
            {[...group.decks]
              .sort((a, b) => b.wins - a.wins)
              .map((d) => {
                const losses = group.gamesPlayed - d.wins;
                const rate = group.gamesPlayed ? d.wins / group.gamesPlayed : 0;
                return (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                    <p className="min-w-0 truncate font-semibold text-white">
                      {d.name}
                      <span className="ml-1 font-normal text-neutral-500">({d.playerName})</span>
                    </p>
                    <span className="shrink-0 tabular-nums text-neutral-400">
                      {d.wins}W – {losses}L
                      <span className="ml-1 font-bold text-emerald-400">{pct(rate)}</span>
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayerMatchupTable({
  matchups,
  podSizeFilter,
}: {
  matchups: ReportingData["playerMatchups"];
  podSizeFilter: number | null;
}) {
  if (matchups.length === 0) {
    return (
      <EmptyState
        text={
          podSizeFilter
            ? `No repeat pods of ${podSizeFilter} players yet.`
            : "No games logged yet — matchups need at least two players in a finished game."
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {matchups.map((group) => (
        <div
          key={group.key}
          className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {group.gamesPlayed} game{group.gamesPlayed === 1 ? "" : "s"}
          </p>
          <div className="flex flex-col gap-1.5">
            {[...group.players]
              .sort((a, b) => b.wins - a.wins)
              .map((p) => {
                const losses = group.gamesPlayed - p.wins;
                const rate = group.gamesPlayed ? p.wins / group.gamesPlayed : 0;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-semibold text-white">
                      {displayName(p.name, p.screenName)}
                    </span>
                    <span className="shrink-0 tabular-nums text-neutral-400">
                      {p.wins}W – {losses}L
                      <span className="ml-1 font-bold text-emerald-400">{pct(rate)}</span>
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FunStatCard({
  emoji,
  label,
  explainer,
  entries,
}: {
  emoji: string;
  label: string;
  explainer?: string;
  entries: { name: string; valueText: string }[];
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className={`text-xs font-semibold uppercase tracking-wide text-neutral-500 ${explainer ? "" : "mb-1"}`}>
        {emoji} {label}
      </p>
      {explainer && <p className="mb-1 text-[11px] text-neutral-600">{explainer}</p>}
      {entries.length === 0 ? (
        <p className="text-sm text-neutral-600">Not enough data yet</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-white">{e.name}</span>
              <span className="shrink-0 text-lg font-black tabular-nums text-emerald-400">
                {e.valueText}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function rankLabel(rank: number): string {
  if (rank === 1) return "🥇 1st";
  if (rank === 2) return "🥈 2nd";
  if (rank === 3) return "🥉 3rd";
  return `${rank}th`;
}

function RankedFunStatCard({
  emoji,
  label,
  explainer,
  ranks,
  unitSingular,
  unitPlural,
  showRankLabel = true,
}: {
  emoji: string;
  label: string;
  explainer?: string;
  ranks: { rank: number; count: number; names: string[] }[];
  unitSingular: string;
  unitPlural: string;
  showRankLabel?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className={`text-xs font-semibold uppercase tracking-wide text-neutral-500 ${explainer ? "" : "mb-2"}`}>
        {emoji} {label}
      </p>
      {explainer && <p className="mb-2 text-[11px] text-neutral-600">{explainer}</p>}
      {ranks.length === 0 ? (
        <p className="text-sm text-neutral-600">Not enough data yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ranks.map((r) => (
            <div key={r.rank}>
              {showRankLabel && (
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  {rankLabel(r.rank)}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {r.names.map((name, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-white">{name}</span>
                    <span className="shrink-0 font-black tabular-nums text-emerald-400">
                      {r.count} {r.count === 1 ? unitSingular : unitPlural}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlacementRow({
  label,
  stat,
}: {
  label: string;
  stat: { count: number; entries: { name: string; screenName: string | null }[] };
}) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      {stat.entries.length === 0 ? (
        <p className="text-sm text-neutral-600">Not enough data yet</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {stat.entries.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-white">
                {displayName(e.name, e.screenName)}
              </span>
              <span className="shrink-0 font-black tabular-nums text-emerald-400">
                {stat.count} {stat.count === 1 ? "finish" : "finishes"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RunnerUpStatsCard({ runnerUp }: { runnerUp: ReportingData["funStats"]["runnerUp"] }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        🥈 Podium, But Sad
      </p>
      <p className="mb-2 text-[11px] text-neutral-600">
        Who finishes just short of the win, most often.
      </p>
      <div className="flex flex-col gap-2">
        <PlacementRow label="2nd Place Finishes" stat={runnerUp.secondPlace} />
        <PlacementRow label="3rd Place Finishes" stat={runnerUp.thirdPlace} />
        <PlacementRow label="4th Place Finishes" stat={runnerUp.fourthPlace} />
      </div>
    </div>
  );
}

function FirstPlayerWinRateCard({
  stat,
}: {
  stat: ReportingData["funStats"]["firstPlayerWinRate"];
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        🎲 First Player Win Rate
      </p>
      <p className="mb-2 text-[11px] text-neutral-600">Does going first actually help?</p>
      {!stat ? (
        <p className="text-sm text-neutral-600">Not enough data yet</p>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-500">
            {stat.wins} of {stat.total} game{stat.total === 1 ? "" : "s"}
          </span>
          <span className="text-2xl font-black tabular-nums text-emerald-400">{pct(stat.winRate)}</span>
        </div>
      )}
    </div>
  );
}

function BiggestHitCard({ biggestHit }: { biggestHit: ReportingData["funStats"]["biggestHit"] }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        💥 Biggest Hit
      </p>
      {!biggestHit ? (
        <p className="text-sm text-neutral-600">Not enough data yet</p>
      ) : (
        <div className="flex flex-col gap-1">
          {biggestHit.hits.map((h, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-white">
                {biggestHit.amount} {h.type === "commanderDamage" ? "commander" : "combat"} damage to{" "}
                {displayName(h.receiver.name, h.receiver.screenName)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BiggestComebackCard({
  comeback,
}: {
  comeback: ReportingData["funStats"]["biggestComeback"];
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        🔥 Biggest Comeback
      </p>
      {!comeback ? (
        <p className="text-sm text-neutral-600">Not enough data yet</p>
      ) : (
        <div className="flex flex-col gap-1">
          {comeback.entries.map((e, i) => (
            <div key={i}>
              <span className="font-semibold text-white">
                {displayName(e.name, e.screenName)} won after dropping to {comeback.minLife} life
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DamageDealtCard({ totalDamage }: { totalDamage: ReportingData["funStats"]["totalDamage"] }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        ⚔️ Damage Dealt
      </p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-white">Total Combat Damage</span>
          <span className="shrink-0 font-black tabular-nums text-emerald-400">
            {totalDamage.combatDamage}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-white">Total Commander Damage</span>
          <span className="shrink-0 font-black tabular-nums text-emerald-400">
            {totalDamage.commanderDamage}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-white">Total Poison Damage</span>
          <span className="shrink-0 font-black tabular-nums text-emerald-400">
            {totalDamage.poisonDamage}
          </span>
        </div>
      </div>
    </div>
  );
}

function TurnDurationRankCard({
  emoji,
  label,
  ranks,
}: {
  emoji: string;
  label: string;
  ranks: ReportingData["funStats"]["longestTurnAvg"];
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {emoji} {label}
      </p>
      {ranks.length === 0 ? (
        <p className="text-sm text-neutral-600">Not enough data yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ranks.map((r) => (
            <div key={r.rank}>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                {rankLabel(r.rank)}
              </p>
              <div className="flex flex-col gap-0.5">
                {r.entries.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-white">
                      {displayName(e.name, e.screenName)}
                    </span>
                    <span className="shrink-0 font-black tabular-nums text-emerald-400">
                      {formatDuration(r.count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AvgTurnsPerGameCard({ avgTurnsPerGame }: { avgTurnsPerGame: number | null }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        🔁 Average Turns Per Game
      </p>
      {avgTurnsPerGame == null ? (
        <p className="text-sm text-neutral-600">Not enough data yet</p>
      ) : (
        <p className="text-2xl font-black tabular-nums text-emerald-400">
          {avgTurnsPerGame.toFixed(1)}
        </p>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between rounded-xl bg-neutral-800/60 px-3 py-2.5 active:scale-[0.99]"
      >
        <span className="text-sm font-bold text-white">
          {emoji} {title}
        </span>
        <span className="text-neutral-400">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}

function FunStatsView({ stats }: { stats: ReportingData["funStats"] }) {
  return (
    <div className="flex flex-col gap-4">
      <CollapsibleSection title="Wins & Losses" emoji="🏆">
        <RankedFunStatCard
          emoji="💀"
          label="Professional Loser"
          ranks={stats.mostLosses.map((r) => ({
            rank: r.rank,
            count: r.count,
            names: r.entries.map((e) => displayName(e.name, e.screenName)),
          }))}
          unitSingular="loss"
          unitPlural="losses"
        />
        <RunnerUpStatsCard runnerUp={stats.runnerUp} />
        <RankedFunStatCard
          emoji="🏳️"
          label="First to Fold"
          explainer="Most scoops"
          ranks={stats.mostScoops.map((r) => ({
            rank: r.rank,
            count: r.count,
            names: r.entries.map((e) => displayName(e.name, e.screenName)),
          }))}
          unitSingular="scoop"
          unitPlural="scoops"
        />
        <RankedFunStatCard
          emoji="🎮"
          label="Plays the most"
          ranks={stats.mostGamesPlayed.map((r) => ({
            rank: r.rank,
            count: r.count,
            names: r.entries.map((e) => displayName(e.name, e.screenName)),
          }))}
          unitSingular="game"
          unitPlural="games"
        />
        <FirstPlayerWinRateCard stat={stats.firstPlayerWinRate} />
      </CollapsibleSection>

      <CollapsibleSection title="Damage & Eliminations" emoji="⚔️">
        <RankedFunStatCard
          emoji="🎯"
          label="Biggest Target"
          explainer="Eliminated first most often"
          ranks={stats.biggestTarget.map((r) => ({
            rank: r.rank,
            count: r.count,
            names: r.entries.map((e) => displayName(e.name, e.screenName)),
          }))}
          unitSingular="game"
          unitPlural="games"
          showRankLabel={false}
        />
        <RankedFunStatCard
          emoji="☠️"
          label="Cause of Death"
          ranks={stats.eliminationReasons.map((r) => ({
            rank: r.rank,
            count: r.count,
            names: r.reasons,
          }))}
          unitSingular="elimination"
          unitPlural="eliminations"
          showRankLabel={false}
        />
        <RankedFunStatCard
          emoji="💀"
          label="Reaper's Turn"
          explainer="Most eliminations happening during their turn"
          ranks={stats.reapersTurn.map((r) => ({
            rank: r.rank,
            count: r.count,
            names: r.entries.map((e) => displayName(e.name, e.screenName)),
          }))}
          unitSingular="elimination"
          unitPlural="eliminations"
        />
        <BiggestHitCard biggestHit={stats.biggestHit} />
        <BiggestComebackCard comeback={stats.biggestComeback} />
        <DamageDealtCard totalDamage={stats.totalDamage} />
      </CollapsibleSection>

      <CollapsibleSection title="Turns & Pace" emoji="⏱️">
        <FunStatCard
          emoji="🕰️"
          label="Longest Turn Ever"
          entries={
            stats.longestTurnEver
              ? stats.longestTurnEver.entries.map((e) => ({
                  name: displayName(e.name, e.screenName),
                  valueText: formatDuration(stats.longestTurnEver!.durationSeconds),
                }))
              : []
          }
        />
        <TurnDurationRankCard emoji="🐌" label="Longest Turn On Average" ranks={stats.longestTurnAvg} />
        <TurnDurationRankCard emoji="⚡" label="Speed Demon" ranks={stats.speedDemon} />
        <AvgTurnsPerGameCard avgTurnsPerGame={stats.avgTurnsPerGame} />
        <FunStatCard
          emoji="⏱️"
          label="IS IT STILL YOUR TURN?!"
          explainer="Longest average game"
          entries={stats.longestAvgGame.map((s) => ({
            name: displayName(s.name, s.screenName),
            valueText: formatDuration(s.avgDurationSeconds),
          }))}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Decks" emoji="🃏">
        <RankedFunStatCard
          emoji="⭐"
          label="Most played commander"
          ranks={stats.mostPlayedCommander.map((r) => ({
            rank: r.rank,
            count: r.count,
            names: r.commanders,
          }))}
          unitSingular="game"
          unitPlural="games"
        />
      </CollapsibleSection>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-10 text-center text-sm text-neutral-500">{text}</p>;
}
