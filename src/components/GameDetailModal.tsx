"use client";

import { useEffect, useState } from "react";
import { getGameDetail, type GameDetail } from "@/app/actions";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

function formatPlayedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

export default function GameDetailModal({
  gameId,
  onClose,
}: {
  gameId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<GameDetail | null>(null);

  useEffect(() => {
    setDetail(null);
    getGameDetail(gameId).then(setDetail);
  }, [gameId]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/80 sm:items-center sm:justify-center">
      <div className="flex max-h-[85vh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-neutral-900 p-5 sm:w-full sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Game Details</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95"
          >
            Done
          </button>
        </div>

        {!detail ? (
          <p className="mt-6 text-center text-sm text-neutral-500">Loading…</p>
        ) : (
          <>
            <p className="text-xs text-neutral-500">
              {formatPlayedAt(detail.playedAt)} · {detail.podSize}-player pod ·{" "}
              {formatDuration(detail.durationSeconds)}
            </p>

            <div className="flex flex-col gap-2">
              {detail.participants.map((p) => (
                <div
                  key={p.playerId}
                  className="rounded-2xl border border-neutral-800 bg-neutral-800/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-white">
                      {p.playerName}
                      {p.playerScreenName && (
                        <span className="font-normal text-neutral-500"> ({p.playerScreenName})</span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 text-sm font-black ${
                        p.won
                          ? "text-emerald-400"
                          : p.eliminationReason === "scoop"
                          ? "text-red-500"
                          : "text-neutral-500"
                      }`}
                    >
                      {p.won ? "Win" : p.placement ? `${ordinal(p.placement)} place` : "—"}
                      {p.eliminationReason === "scoop" && " · Scooped"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-neutral-300">
                    {p.commander || p.deckName || (
                      <span className="text-neutral-600">No deck selected</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Final life:{" "}
                    <span className="tabular-nums text-neutral-300">
                      {p.finalLife ?? "—"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
