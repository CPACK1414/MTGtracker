"use client";

import { useMemo, useState } from "react";
import {
  COMMANDER_DAMAGE_LETHAL,
  POISON_LETHAL,
  makeEmptyDamage,
  makePlayers,
  type PodSelection,
  type Player,
} from "@/lib/types";
import type { PlayerProfile } from "@/lib/library";
import { saveGame } from "@/app/actions";
import { getLayoutTemplate, gridTemplateAreas, type Rotation } from "@/lib/layout";
import WelcomeScreen from "@/components/WelcomeScreen";
import PodSetupScreen from "@/components/PodSetupScreen";
import PlayerLibraryScreen from "@/components/PlayerLibraryScreen";
import PlayerCard, { type OpponentDamage } from "@/components/PlayerCard";
import RotatableCard from "@/components/RotatableCard";
import FirstPlayerRandomizer from "@/components/FirstPlayerRandomizer";
import EndGameModal from "@/components/EndGameModal";
import CounterModal from "@/components/CounterModal";
import StatsScreen from "@/components/StatsScreen";
import GameTimer from "@/components/GameTimer";

type HomeScreen = "welcome" | "newGame" | "library" | "stats";
type CounterMap = Record<string, number>;

export default function GameApp({ initialPlayers }: { initialPlayers: PlayerProfile[] }) {
  const [libraryPlayers, setLibraryPlayers] = useState<PlayerProfile[]>(initialPlayers);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [homeScreen, setHomeScreen] = useState<HomeScreen>("welcome");
  const [damage, setDamage] = useState<Record<string, Record<string, number>>>({});
  const [poison, setPoison] = useState<CounterMap>({});
  const [radiation, setRadiation] = useState<CounterMap>({});
  const [firstPlayerId, setFirstPlayerId] = useState<string | null>(null);
  const [showRandomizer, setShowRandomizer] = useState(false);
  const [eliminationOrder, setEliminationOrder] = useState<string[]>([]);
  const [showEndGame, setShowEndGame] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rotations, setRotations] = useState<Record<string, Rotation>>({});
  const [counterModalPlayerId, setCounterModalPlayerId] = useState<string | null>(null);
  const [gameStartedAt, setGameStartedAt] = useState<number | null>(null);

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
    setPoison(Object.fromEntries(newPlayers.map((p) => [p.id, 0])));
    setRadiation(Object.fromEntries(newPlayers.map((p) => [p.id, 0])));
    setFirstPlayerId(null);
    setEliminationOrder([]);

    const template = getLayoutTemplate(newPlayers.length);
    const initialRotations: Record<string, Rotation> = {};
    newPlayers.forEach((p, i) => {
      initialRotations[p.id] = template.placements[i]?.rotation ?? 0;
    });
    setRotations(initialRotations);
    setGameStartedAt(Date.now());
  }

  function rotatePlayer(id: string) {
    setRotations((prev) => {
      const current = prev[id] ?? 0;
      const next = ((current + 90) % 360) as Rotation;
      return { ...prev, [id]: next };
    });
  }

  function resetToSetup() {
    setPlayers(null);
    setDamage({});
    setPoison({});
    setRadiation({});
    setFirstPlayerId(null);
    setEliminationOrder([]);
    setShowEndGame(false);
    setSaveError(null);
    setRotations({});
    setCounterModalPlayerId(null);
    setGameStartedAt(null);
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
    const current = damage[fromId]?.[toId] ?? 0;
    const next = Math.max(0, current + delta);
    const actualDelta = next - current;
    if (actualDelta === 0) return;

    setDamage((prev) => {
      const prevCurrent = prev[fromId]?.[toId] ?? 0;
      return {
        ...prev,
        [fromId]: { ...prev[fromId], [toId]: prevCurrent + actualDelta },
      };
    });
    changeLife(toId, -actualDelta);
  }

  function changePoison(id: string, delta: number) {
    setPoison((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }

  function changeRadiation(id: string, delta: number) {
    setRadiation((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
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
      const durationSeconds = gameStartedAt
        ? Math.max(0, Math.floor((Date.now() - gameStartedAt) / 1000))
        : 0;
      await saveGame({
        podSize: players.length,
        durationSeconds,
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

  const sortedLibraryPlayers = useMemo(
    () => [...libraryPlayers].sort((a, b) => a.name.localeCompare(b.name)),
    [libraryPlayers]
  );

  if (!players) {
    if (homeScreen === "newGame") {
      return (
        <PodSetupScreen
          players={sortedLibraryPlayers}
          onBack={() => setHomeScreen("welcome")}
          onManagePlayers={() => setHomeScreen("library")}
          onStart={startGame}
        />
      );
    }
    if (homeScreen === "library") {
      return (
        <PlayerLibraryScreen
          players={sortedLibraryPlayers}
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

  const layoutTemplate = getLayoutTemplate(players.length);

  return (
    <div className="flex flex-1 flex-col">
      <header className="grid grid-cols-3 items-center gap-2 border-b border-neutral-800 px-4 py-3">
        <button
          onClick={() => setShowEndGame(true)}
          className="justify-self-start text-sm font-semibold text-neutral-400"
        >
          🏁 End
        </button>
        {gameStartedAt && <GameTimer startedAt={gameStartedAt} />}
        <button
          onClick={() => setShowRandomizer(true)}
          className="justify-self-end text-sm font-semibold text-emerald-400"
        >
          🎲 First
        </button>
      </header>

      <div
        className="flex-1 gap-3 p-3"
        style={{
          display: "grid",
          gridTemplateColumns: layoutTemplate.columns,
          gridTemplateRows: layoutTemplate.rows,
          gridTemplateAreas: gridTemplateAreas(layoutTemplate),
        }}
      >
        {players.map((p, i) => {
          const myPlacement = layoutTemplate.placements[i];
          const opponents: OpponentDamage[] = players
            .filter((o) => o.id !== p.id)
            .map((o) => ({ id: o.id, name: o.name, amount: damage[o.id]?.[p.id] ?? 0 }));

          const singleOpponent = players.length === 2 ? opponents[0] : undefined;
          const groupOpponents = players.length > 2 ? opponents : undefined;

          return (
            <RotatableCard
              key={p.id}
              rotation={rotations[p.id] ?? 0}
              style={{ gridArea: myPlacement?.area }}
            >
              <PlayerCard
                player={p}
                isFirst={p.id === firstPlayerId}
                isLethal={
                  p.life <= 0 ||
                  (maxIncomingDamage[p.id] ?? 0) >= COMMANDER_DAMAGE_LETHAL ||
                  (poison[p.id] ?? 0) >= POISON_LETHAL
                }
                singleOpponent={singleOpponent}
                groupOpponents={groupOpponents}
                poison={poison[p.id] ?? 0}
                radiation={radiation[p.id] ?? 0}
                onChangeLife={(delta) => changeLife(p.id, delta)}
                onToggleEliminate={() => toggleEliminate(p.id)}
                onRotate={() => rotatePlayer(p.id)}
                onChangeCommanderDamage={(fromId, delta) => changeDamage(fromId, p.id, delta)}
                onOpenCounters={() => setCounterModalPlayerId(p.id)}
              />
            </RotatableCard>
          );
        })}
      </div>

      {counterModalPlayerId &&
        (() => {
          const p = players.find((pl) => pl.id === counterModalPlayerId);
          if (!p) return null;
          const opponents: OpponentDamage[] = players
            .filter((o) => o.id !== p.id)
            .map((o) => ({ id: o.id, name: o.name, amount: damage[o.id]?.[p.id] ?? 0 }));
          return (
            <CounterModal
              playerName={p.name}
              rotation={rotations[p.id] ?? 0}
              opponents={opponents}
              poison={poison[p.id] ?? 0}
              radiation={radiation[p.id] ?? 0}
              onChangeCommanderDamage={(fromId, delta) => changeDamage(fromId, p.id, delta)}
              onChangePoison={(delta) => changePoison(p.id, delta)}
              onChangeRadiation={(delta) => changeRadiation(p.id, delta)}
              onClose={() => setCounterModalPlayerId(null)}
            />
          );
        })()}

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
