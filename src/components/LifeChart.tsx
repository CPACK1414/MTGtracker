"use client";

import { useState } from "react";
import type { GameLifeChart } from "@/app/actions";

const COLORS = ["#34d399", "#22d3ee", "#a78bfa", "#fbbf24"];

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function displayName(name: string, screenName: string | null) {
  return screenName ? `${name} (${screenName})` : name;
}

function eliminationLabel(reason: string | null): string {
  if (reason === "commanderDamage") return "commander damage";
  if (reason === "combatDamage") return "combat damage";
  if (reason === "poison") return "poison";
  if (reason === "scoop") return "scooped";
  return "eliminated";
}

type Selected = { playerId: string; elapsedSeconds: number; life: number };

export default function LifeChart({ chart }: { chart: GameLifeChart }) {
  const [selected, setSelected] = useState<Selected | null>(null);

  const width = 600;
  const height = 260;
  const padding = { top: 16, right: 14, bottom: 28, left: 30 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxTime = Math.max(chart.durationSeconds, 1);
  const allLifeValues = chart.series.flatMap((s) => s.points.map((p) => p.life));
  const maxLife = Math.max(40, ...allLifeValues, 1);
  const minLife = Math.min(0, ...allLifeValues);
  const lifeSpan = maxLife - minLife || 1;

  function x(t: number) {
    return padding.left + (t / maxTime) * plotW;
  }
  function y(life: number) {
    return padding.top + plotH - ((life - minLife) / lifeSpan) * plotH;
  }

  function pathFor(points: { elapsedSeconds: number; life: number }[]) {
    if (points.length === 0) return "";
    let d = `M ${x(points[0].elapsedSeconds)} ${y(points[0].life)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      d += ` L ${x(cur.elapsedSeconds)} ${y(prev.life)} L ${x(cur.elapsedSeconds)} ${y(cur.life)}`;
    }
    return d;
  }

  const gridLines = [0, 10, 20, 30, 40].filter((v) => v >= minLife - 0.01 && v <= maxLife + 0.01);
  const selectedSeries = selected ? chart.series.find((s) => s.playerId === selected.playerId) : null;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1 rounded-xl bg-neutral-800/40 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
        >
          {gridLines.map((v) => (
            <g key={v}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y(v)}
                y2={y(v)}
                stroke="#2e2e2e"
                strokeWidth={1}
              />
              <text x={padding.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#737373">
                {v}
              </text>
            </g>
          ))}
          <text x={padding.left} y={height - 8} fontSize={9} fill="#737373">
            0:00
          </text>
          <text x={width - padding.right} y={height - 8} fontSize={9} fill="#737373" textAnchor="end">
            {formatElapsed(maxTime)}
          </text>

          {chart.series.map((s, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <g key={s.playerId}>
                <path d={pathFor(s.points)} fill="none" stroke={color} strokeWidth={2} />
                {s.points.map((p, pi) => (
                  <circle
                    key={pi}
                    cx={x(p.elapsedSeconds)}
                    cy={y(p.life)}
                    r={9}
                    fill={color}
                    fillOpacity={0}
                    stroke="none"
                    onClick={() => setSelected({ playerId: s.playerId, elapsedSeconds: p.elapsedSeconds, life: p.life })}
                    style={{ cursor: "pointer" }}
                  />
                ))}
                {s.points.map((p, pi) => (
                  <circle
                    key={`dot-${pi}`}
                    cx={x(p.elapsedSeconds)}
                    cy={y(p.life)}
                    r={3}
                    fill={color}
                    stroke="#171717"
                    strokeWidth={1}
                    pointerEvents="none"
                  />
                ))}
                {s.eliminatedAt && (
                  <g pointerEvents="none">
                    <line
                      x1={x(s.eliminatedAt.elapsedSeconds) - 6}
                      y1={y(s.eliminatedAt.life) - 6}
                      x2={x(s.eliminatedAt.elapsedSeconds) + 6}
                      y2={y(s.eliminatedAt.life) + 6}
                      stroke={color}
                      strokeWidth={2.5}
                    />
                    <line
                      x1={x(s.eliminatedAt.elapsedSeconds) - 6}
                      y1={y(s.eliminatedAt.life) + 6}
                      x2={x(s.eliminatedAt.elapsedSeconds) + 6}
                      y2={y(s.eliminatedAt.life) - 6}
                      stroke={color}
                      strokeWidth={2.5}
                    />
                  </g>
                )}
                {chart.winnerPlayerId === s.playerId &&
                  s.points.length > 0 &&
                  (() => {
                    const last = s.points[s.points.length - 1];
                    return (
                      <text
                        x={x(last.elapsedSeconds)}
                        y={y(last.life)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={16}
                        pointerEvents="none"
                      >
                        🏆
                      </text>
                    );
                  })()}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1.5">
        {chart.series.map((s, i) => (
          <div key={s.playerId} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="font-semibold text-neutral-200">{displayName(s.playerName, s.playerScreenName)}</span>
            {s.eliminatedAt && (
              <span className="text-neutral-500">
                out {formatElapsed(s.eliminatedAt.elapsedSeconds)} · {eliminationLabel(s.eliminatedAt.reason)}
              </span>
            )}
          </div>
        ))}
      </div>

      {selected && selectedSeries && (
        <div className="shrink-0 rounded-xl bg-neutral-800 px-3 py-2 text-sm">
          <span className="font-semibold text-white">
            {displayName(selectedSeries.playerName, selectedSeries.playerScreenName)}
          </span>
          <span className="text-neutral-400">
            {" "}
            — {selected.life} life at {formatElapsed(selected.elapsedSeconds)}
          </span>
        </div>
      )}
    </div>
  );
}
