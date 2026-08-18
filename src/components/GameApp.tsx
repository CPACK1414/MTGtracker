"use client";

import { useMemo, useState } from "react";
import {
  COMMANDER_DAMAGE_LETHAL,
  makeEmptyDamage,
  makePlayers,
  type PodSelection,
  type Player,
} from "@/lib/types";
import type { PlayerProfile } from "@/lib/library";
import { saveGame } from "@/app/actions";
import WelcomeScreen from "@/components/WelcomeScreen";
import PodSetupScreen from "@/components/PodSetupScreen";
import PlayerLibraryScreen from "@/components/PlayerLibraryScreen";
import PlayerCard from "@/components/PlayerCard";
import DamageView from "@/components/DamageView";
import FirstPlayerRandomizer from "@/components/FirstPlayerRandomizer";
import EndGameModal from "@/components/EndGameModal";
import StatsScreen from "@/components/StatsScreen";

type View = "life" | "damage";
type HomeScreen = "welcome" | "newGame" | "library" | "stats";

export default function GameApp({ initialPlayers }: { initialPlayers: PlayerProfile[] }) {
  const [libraryPlayers, setLibraryPlayers] = useState<PlayerProfile[]>(initialPlayers);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [homeScreen, setHomeScreen] = useState<HomeScreen>("welcome");
  const [damage, setDamage] = useState<Record<string, Record<string, number>>>({});
  const [view, setView] = useState<View>("life");
  const [firstPlayerId, setFirstPlayerId] = useState<string | null>(null);
  const [showRandomizer, setShowRandomizer] = useState(false);
  const [eliminationOrder, setEliminationOrder] = useState<string[]>([]);
  const [showEndGame, setShowEndGame] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  function startGame(selections: PodSelection[]) {
    const newPlayers = makePlayers(selections);
    setPlayers(newPlayers);
    setDamage(makeEmptyDamage(newPlayers));
    setFirstPlayerId(null);
    setEliminationOrder([]);
    setView("life");
  }

  function resetToSetup() {
    setPlayers(null);
    setDamage({});
    setFirstPlayerId(null);
    setEliminationOrder([]);
    setShowEndGame(false);
    setSaveError(null);
    setHomeScreen("welcome");
  }

  function changeLife(id: string, delta: number) {
    setPlayers((prev) =>
      prev
        ? prev.map((p) => (p.id === id ? { ...p, life: p.life + delta } : p))
        : prev
    );
  }

  function toggleEliminate(id: string) {
    setPlayers((prev) => {
      if (!prev) return prev;
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      const nowEliminated = !target.eliminated;
      setEliminationOrder((order) =>
        nowEliminated
          ? order.includes(id)
            ? order
            : [...order, id]
          : order.filter((x) => x !== id)
      );
      return prev.map((p) => (p.id === id ? { ...p, eliminated: nowEliminated } : p));
    });
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

  function placementsFor(winnerId: string): Record<string, number> {
    if (!players) return {};
    const others = players.filter((p) => p.id !== winnerId);
    const alive = others
      .filter((p) => !p.eliminated)
      .sort((a, b) => b.life - a.life);
    const eliminated = others
      .filter((p) => p.eliminated)
      .sort((a, b) => eliminationOrder.indexOf(b.id) - eliminationOrder.indexOf(a.id));
    const ordered = [...alive, ...eliminated];

    const placements: Record<string, number> = { [winnerId]: 1 };
    ordered.forEach((p, i) => {
      placements[p.id] = i + 2;
    });
    return placements;
  }

  async function handleEndGame(winnerId: string) {
    if (!players) return;
    setSaving(true);
    setSaveError(null);

    const placements = placementsFor(winnerId);
    const winner = players.find((p) => p.id === winnerId)!;

    const damageRows: { fromPlayerId: string; toPlayerId: string; amount: number }[] = [];
    for (const from of players) {
      for (const to of players) {
        if (from.id === to.id) continue;
        const amount = damage[from.id]?.[to.id] ?? 0;
        if (amount > 0) damageRows.push({ fromPlayerId: from.id, toPlayerId: to.id, amount });
      }
    }

    try {
      await saveGame({
        podSize: players.length,
        winnerPlayerId: winner.profileId,
        winnerDeckId: winner.deckId,
        participants: players.map((p, i) => ({
          playerId: p.profileId,
          deckId: p.deckId,
          seatOrder: i + 1,
          finalLife: p.life,
          placement: placements[p.id],
        })),
        damage: damageRows,
      });
      resetToSetup();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save the game. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!players) {
    if (homeScreen === "newGame") {
      return (
        <PodSetupScreen
          players={libraryPlayers}
          onBack={() => setHomeScreen("welcome")}
          onManagePlayers={() => setHomeScreen("library")}
          onStart={startGame}
        />
      );
    }
    if (homeScreen === "library") {
      return (
        <PlayerLibraryScreen
          players={libraryPlayers}
          onChangePlayers={setLibraryPlayers}
          onBack={() => setHomeScreen("welcome")}
        />
      );
    }
    if (homeScreen === "stats") {
      return <StatsScreen onBack={() => setHomeScreen("welcome")} />;
    }
    return (
      <WelcomeScreen
        onNewGame={() => setHomeScreen("newGame")}
        onLibrary={() => setHomeScreen("library")}
        onStats={() => setHomeScreen("stats")}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <button
          onClick={() => setShowEndGame(true)}
          className="text-sm font-semibold text-neutral-400"
        >
          🏁 End
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

      {showEndGame && (
        <EndGameModal
          players={players}
          saving={saving}
          error={saveError}
          onCancel={() => {
            setShowEndGame(false);
            setSaveError(null);
          }}
          onConfirm={handleEndGame}
        />
      )}
    </div>
  );
}
