"use client";

import { useMemo, useState } from "react";
import {
  COMMANDER_DAMAGE_LETHAL,
  makeEmptyDamage,
  makePlayers,
  type Player,
} from "@/lib/types";
import PodSetup from "@/components/PodSetup";
import PlayerCard from "@/components/PlayerCard";
import DamageView from "@/components/DamageView";
import FirstPlayerRandomizer from "@/components/FirstPlayerRandomizer";

type View = "life" | "damage";

export default function GameApp() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [damage, setDamage] = useState<Record<string, Record<string, number>>>({});
  const [view, setView] = useState<View>("life");
  const [firstPlayerId, setFirstPlayerId] = useState<string | null>(null);
  const [showRandomizer, setShowRandomizer] = useState(false);

  const maxIncomingDamage = useMemo(() => {
    const map: Record<string, number> = {};
    if (!players) return map;
    for (const to of players) {
      let max = 0;
      for (const from of players) {
        if (from.id === to.id) continue;
        max = Math.max(max, damage[from.id]?.[to.id] ?? 0);
      }
      map[to.id] = max;
    }
    return map;
  }, [players, damage]);

  function startGame(podSize: number) {
    const newPlayers = makePlayers(podSize);
    setPlayers(newPlayers);
    setDamage(makeEmptyDamage(newPlayers));
    setFirstPlayerId(null);
    setView("life");
  }

  function endGame() {
    setPlayers(null);
    setDamage({});
    setFirstPlayerId(null);
  }

  function changeLife(id: string, delta: number) {
    setPlayers((prev) =>
      prev
        ? prev.map((p) => (p.id === id ? { ...p, life: p.life + delta } : p))
        : prev
    );
  }

  function renamePlayer(id: string, name: string) {
    setPlayers((prev) =>
      prev ? prev.map((p) => (p.id === id ? { ...p, name } : p)) : prev
    );
  }

  function toggleEliminate(id: string) {
    setPlayers((prev) =>
      prev
        ? prev.map((p) =>
            p.id === id ? { ...p, eliminated: !p.eliminated } : p
          )
        : prev
    );
  }

  function changeDamage(fromId: string, toId: string, delta: number) {
    setDamage((prev) => {
      const current = prev[fromId]?.[toId] ?? 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [fromId]: { ...prev[fromId], [toId]: next },
      };
    });
  }

  if (!players) {
    return <PodSetup onStart={startGame} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button
          onClick={endGame}
          className="text-sm font-semibold text-neutral-400"
        >
          ← New Pod
        </button>
        <div className="flex gap-1 rounded-full bg-neutral-900 p-1">
          <button
            onClick={() => setView("life")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              view === "life" ? "bg-indigo-500 text-white" : "text-neutral-400"
            }`}
          >
            Life
          </button>
          <button
            onClick={() => setView("damage")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              view === "damage" ? "bg-indigo-500 text-white" : "text-neutral-400"
            }`}
          >
            Damage
          </button>
        </div>
        <button
          onClick={() => setShowRandomizer(true)}
          className="text-sm font-semibold text-emerald-400"
        >
          🎲 First
        </button>
      </header>

      {view === "life" ? (
        <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-3 p-3">
          {players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isFirst={p.id === firstPlayerId}
              isLethal={
                p.life <= 0 ||
                (maxIncomingDamage[p.id] ?? 0) >= COMMANDER_DAMAGE_LETHAL
              }
              onChangeLife={(delta) => changeLife(p.id, delta)}
              onRename={(name) => renamePlayer(p.id, name)}
              onToggleEliminate={() => toggleEliminate(p.id)}
            />
          ))}
        </div>
      ) : (
        <DamageView
          players={players}
          damage={damage}
          onChangeDamage={changeDamage}
        />
      )}

      {showRandomizer && (
        <FirstPlayerRandomizer
          players={players}
          onPicked={setFirstPlayerId}
          onClose={() => setShowRandomizer(false)}
        />
      )}
    </div>
  );
}
