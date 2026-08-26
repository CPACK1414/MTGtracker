"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  COMMANDER_DAMAGE_LETHAL,
  POISON_LETHAL,
  STARTING_LIFE,
  makeEmptyDamage,
  makePlayers,
  type PodSelection,
  type Player,
  type EliminationReason,
} from "@/lib/types";
import type { PlayerProfile } from "@/lib/library";
import { saveGame, type GameEventInput } from "@/app/actions";
import { getLayoutTemplate, getValidRotations, gridTemplateAreas, type Rotation } from "@/lib/layout";
import WelcomeScreen from "@/components/WelcomeScreen";
import PodSetupScreen from "@/components/PodSetupScreen";
import PlayerLibraryScreen from "@/components/PlayerLibraryScreen";
import PlayerCard, { type OpponentDamage } from "@/components/PlayerCard";
import RotatableCard from "@/components/RotatableCard";
import FirstPlayerRandomizer from "@/components/FirstPlayerRandomizer";
import EndGameModal from "@/components/EndGameModal";
import ConfirmModal from "@/components/ConfirmModal";
import CounterModal from "@/components/CounterModal";
import EliminationModal from "@/components/EliminationModal";
import StatsScreen from "@/components/StatsScreen";
import GameTimer from "@/components/GameTimer";
import GameHistoryScreen from "@/components/GameHistoryScreen";
import { useWakeLock } from "@/lib/useWakeLock";
import { useConfirmUnload } from "@/lib/useConfirmUnload";

type HomeScreen = "welcome" | "newGame" | "library" | "stats" | "gameHistory";
type CounterMap = Record<string, number>;
type PendingChange = { life: number; commanderDamage: number; poison: number; radiation: number };

const CHANGE_BATCH_WINDOW_MS = 10000;

export default function GameApp({ initialPlayers }: { initialPlayers: PlayerProfile[] }) {
  const [libraryPlayers, setLibraryPlayers] = useState<PlayerProfile[]>(initialPlayers);
  const [players, setPlayers] = useState<Player[] | null>(null);
  useWakeLock(Boolean(players));
  useConfirmUnload(Boolean(players));
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
  const [eliminationModalPlayerId, setEliminationModalPlayerId] = useState<string | null>(null);
  const [gameStartedAt, setGameStartedAt] = useState<number | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [turnStartedAtElapsed, setTurnStartedAtElapsed] = useState<number | null>(null);
  const [lastPass, setLastPass] = useState<{
    previousPlayerId: string;
    previousTurnStartedAtElapsed: number;
    previousRoundNumber: number;
    pushedEvent: GameEventInput;
  } | null>(null);
  const [hasPassedOnce, setHasPassedOnce] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);

  const eventsRef = useRef<GameEventInput[]>([]);
  const pendingChangesRef = useRef<Record<string, PendingChange>>({});
  const pendingWindowStartRef = useRef<number | null>(null);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
    };
  }, []);

  function elapsedSecondsNow(): number {
    return gameStartedAt ? Math.max(0, Math.floor((Date.now() - gameStartedAt) / 1000)) : 0;
  }

  function flushPendingChanges() {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    const pending = pendingChangesRef.current;
    const elapsedSeconds = pendingWindowStartRef.current ?? elapsedSecondsNow();
    pendingChangesRef.current = {};
    pendingWindowStartRef.current = null;

    for (const [playerId, change] of Object.entries(pending)) {
      if (
        change.life === 0 &&
        change.commanderDamage === 0 &&
        change.poison === 0 &&
        change.radiation === 0
      )
        continue;
      eventsRef.current.push({
        elapsedSeconds,
        type: "change",
        playerId,
        lifeDelta: change.life,
        commanderDamageDelta: change.commanderDamage,
        poisonDelta: change.poison,
        radiationDelta: change.radiation,
      });
    }
  }

  function queueChange(playerId: string, kind: keyof PendingChange, delta: number) {
    if (delta === 0) return;
    if (pendingWindowStartRef.current === null) {
      pendingWindowStartRef.current = elapsedSecondsNow();
    }
    const current = pendingChangesRef.current[playerId] ?? {
      life: 0,
      commanderDamage: 0,
      poison: 0,
      radiation: 0,
    };
    current[kind] += delta;
    pendingChangesRef.current[playerId] = current;

    if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
    batchTimeoutRef.current = setTimeout(flushPendingChanges, CHANGE_BATCH_WINDOW_MS);
  }

  function logInstantEvent(
    playerId: string,
    type: "eliminated" | "revived",
    eliminationReason?: EliminationReason | null
  ) {
    eventsRef.current.push({
      elapsedSeconds: elapsedSecondsNow(),
      type,
      playerId,
      eliminationReason: eliminationReason ?? null,
    });
  }

  function nextTurnPlayerId(afterId: string): string | null {
    if (!players) return null;
    const idx = players.findIndex((p) => p.id === afterId);
    if (idx === -1) return players.find((p) => !p.eliminated)?.id ?? null;
    for (let step = 1; step <= players.length; step++) {
      const candidate = players[(idx + step) % players.length];
      if (!candidate.eliminated) return candidate.id;
    }
    return null;
  }

  function endCurrentTurnAndAdvance(passingPlayerId: string, undoable: boolean) {
    if (turnStartedAtElapsed === null) return;
    const now = elapsedSecondsNow();
    const duration = Math.max(0, now - turnStartedAtElapsed);
    const event: GameEventInput = {
      elapsedSeconds: now,
      type: "turnEnded",
      playerId: passingPlayerId,
      turnDurationSeconds: duration,
    };
    eventsRef.current.push(event);
    setLastPass(
      undoable
        ? {
            previousPlayerId: passingPlayerId,
            previousTurnStartedAtElapsed: turnStartedAtElapsed,
            previousRoundNumber: roundNumber,
            pushedEvent: event,
          }
        : null
    );
    setHasPassedOnce(true);
    const next = nextTurnPlayerId(passingPlayerId);
    if (next && next === firstPlayerId) {
      setRoundNumber((n) => n + 1);
    }
    setCurrentTurnPlayerId(next);
    setTurnStartedAtElapsed(next ? now : null);
  }

  function passTurn() {
    if (!currentTurnPlayerId) return;
    endCurrentTurnAndAdvance(currentTurnPlayerId, true);
  }

  function undoPass() {
    if (!lastPass) return;
    const idx = eventsRef.current.lastIndexOf(lastPass.pushedEvent);
    if (idx !== -1) eventsRef.current.splice(idx, 1);
    setCurrentTurnPlayerId(lastPass.previousPlayerId);
    setTurnStartedAtElapsed(lastPass.previousTurnStartedAtElapsed);
    setRoundNumber(lastPass.previousRoundNumber);
    setLastPass(null);
  }

  function handleRandomizerClose() {
    setShowRandomizer(false);
    if (currentTurnPlayerId === null && firstPlayerId) {
      setCurrentTurnPlayerId(firstPlayerId);
      setTurnStartedAtElapsed(elapsedSecondsNow());
    }
  }

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

  function startGame(selections: PodSelection[], customRotations?: Rotation[]) {
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
      initialRotations[p.id] = customRotations?.[i] ?? template.placements[i]?.rotation ?? 0;
    });
    setRotations(initialRotations);
    setGameStartedAt(Date.now());
    setShowRandomizer(true);
    setCurrentTurnPlayerId(null);
    setTurnStartedAtElapsed(null);
    setLastPass(null);
    setHasPassedOnce(false);
    setRoundNumber(1);
    setShowRerollConfirm(false);

    if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
    batchTimeoutRef.current = null;
    pendingChangesRef.current = {};
    pendingWindowStartRef.current = null;
    eventsRef.current = [];
  }

  function restartGame() {
    if (!players) return;
    const freshPlayers = players.map((p) => ({
      ...p,
      life: STARTING_LIFE,
      eliminated: false,
      eliminationReason: undefined,
    }));
    setPlayers(freshPlayers);
    setDamage(makeEmptyDamage(freshPlayers));
    setPoison(Object.fromEntries(freshPlayers.map((p) => [p.id, 0])));
    setRadiation(Object.fromEntries(freshPlayers.map((p) => [p.id, 0])));
    setFirstPlayerId(null);
    setEliminationOrder([]);
    setGameStartedAt(Date.now());
    setCurrentTurnPlayerId(null);
    setTurnStartedAtElapsed(null);
    setLastPass(null);
    setHasPassedOnce(false);
    setRoundNumber(1);
    setShowRandomizer(true);

    if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
    batchTimeoutRef.current = null;
    pendingChangesRef.current = {};
    pendingWindowStartRef.current = null;
    eventsRef.current = [];
  }

  function rotatePlayer(id: string) {
    if (!players) return;
    const idx = players.findIndex((p) => p.id === id);
    const area = idx !== -1 ? getLayoutTemplate(players.length).placements[idx]?.area : undefined;
    const validRotations = area ? getValidRotations(players.length, area) : ([0, 90, 180, 270] as Rotation[]);
    setRotations((prev) => {
      const current = prev[id] ?? 0;
      const currentIdx = validRotations.indexOf(current);
      const next = validRotations[(currentIdx + 1) % validRotations.length];
      return { ...prev, [id]: next };
    });
  }

  function resetToSetup() {
    setPlayers(null);
    setDamage({});
    setPoison({});
    setRadiation({});
    setFirstPlayerId(null);
    setShowRandomizer(false);
    setEliminationOrder([]);
    setShowEndGame(false);
    setSaveError(null);
    setRotations({});
    setCounterModalPlayerId(null);
    setEliminationModalPlayerId(null);
    setGameStartedAt(null);
    setCurrentTurnPlayerId(null);
    setTurnStartedAtElapsed(null);
    setLastPass(null);
    setHasPassedOnce(false);
    setRoundNumber(1);
    setShowRerollConfirm(false);
    setHomeScreen("welcome");

    if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
    batchTimeoutRef.current = null;
    pendingChangesRef.current = {};
    pendingWindowStartRef.current = null;
    eventsRef.current = [];
  }

  function changeLife(id: string, delta: number, kind: "life" | "commanderDamage" = "life") {
    setPlayers((prev) =>
      prev
        ? prev.map((p) => (p.id === id ? { ...p, life: p.life + delta } : p))
        : prev
    );
    queueChange(id, kind, delta);
  }

  function eliminatePlayer(id: string, reason: EliminationReason) {
    setPlayers((prev) =>
      prev
        ? prev.map((p) => (p.id === id ? { ...p, eliminated: true, eliminationReason: reason } : p))
        : prev
    );
    setEliminationOrder((order) => (order.includes(id) ? order : [...order, id]));
    // Flush any pending batched damage first so the hit that caused the
    // death is logged (and ordered) before the elimination itself, instead
    // of sitting in the batch window until it happens to flush later.
    flushPendingChanges();
    logInstantEvent(id, "eliminated", reason);
    if (id === currentTurnPlayerId) {
      endCurrentTurnAndAdvance(id, false);
    }
  }

  function revivePlayer(id: string) {
    setPlayers((prev) =>
      prev
        ? prev.map((p) =>
            p.id === id ? { ...p, eliminated: false, eliminationReason: undefined } : p
          )
        : prev
    );
    setEliminationOrder((order) => order.filter((x) => x !== id));
    logInstantEvent(id, "revived");
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
    changeLife(toId, -actualDelta, "commanderDamage");
  }

  function changePoison(id: string, delta: number) {
    const current = poison[id] ?? 0;
    const next = Math.max(0, current + delta);
    const actualDelta = next - current;
    if (actualDelta === 0) return;

    setPoison((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
    queueChange(id, "poison", actualDelta);
  }

  function changeRadiation(id: string, delta: number) {
    const current = radiation[id] ?? 0;
    const next = Math.max(0, current + delta);
    const actualDelta = next - current;
    if (actualDelta === 0) return;

    setRadiation((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
    queueChange(id, "radiation", actualDelta);
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
      flushPendingChanges();
      await saveGame({
        podSize: players.length,
        durationSeconds,
        winnerPlayerId: winner.profileId,
        winnerDeckId: winner.deckId,
        firstPlayerId: firstPlayerId,
        participants: players.map((p, i) => ({
          playerId: p.profileId,
          deckId: p.deckId,
          seatOrder: i + 1,
          finalLife: p.life,
          placement: placements[p.id],
          eliminationReason: p.eliminationReason ?? null,
        })),
        damage: damageRows,
        events: eventsRef.current,
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
          onChangePlayers={setLibraryPlayers}
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
    if (homeScreen === "gameHistory") {
      return <GameHistoryScreen onBack={() => setHomeScreen("welcome")} />;
    }
    return (
      <WelcomeScreen
        onNewGame={() => setHomeScreen("newGame")}
        onLibrary={() => setHomeScreen("library")}
        onStats={() => setHomeScreen("stats")}
        onGameHistory={() => setHomeScreen("gameHistory")}
      />
    );
  }

  const layoutTemplate = getLayoutTemplate(players.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-1 border-b border-neutral-800 px-2 py-1 md:gap-2 md:px-4 md:py-2">
        <button
          onClick={() => setShowEndGame(true)}
          className="shrink-0 text-sm font-semibold text-neutral-400 md:text-base"
        >
          🏁 End
        </button>
        <button
          onClick={undoPass}
          disabled={!lastPass}
          className="shrink-0 rounded-full bg-neutral-800 px-2.5 py-1.5 text-xs font-bold text-neutral-400 active:scale-95 disabled:opacity-30 md:px-4 md:py-2 md:text-sm"
        >
          Undo Pass
        </button>
        {gameStartedAt && turnStartedAtElapsed !== null ? (
          <GameTimer startedAt={gameStartedAt + turnStartedAtElapsed * 1000} />
        ) : (
          <span className="text-sm font-semibold tabular-nums text-neutral-600 md:text-base">0:00</span>
        )}
        <button
          onClick={passTurn}
          disabled={!currentTurnPlayerId}
          className="tap-target-expand shrink-0 rounded-full bg-neutral-800 px-3 py-2 text-xs font-bold text-emerald-400 active:scale-95 disabled:opacity-30 md:px-5 md:py-2.5 md:text-sm"
        >
          ⏭️ Pass ⏭️
        </button>
        <div className="flex min-w-8 shrink-0 items-center justify-end">
          {!hasPassedOnce ? (
            <button
              onClick={() => setShowRerollConfirm(true)}
              aria-label="Restart game"
              className="text-lg leading-none md:text-2xl"
            >
              🎲
            </button>
          ) : (
            <span className="text-sm font-semibold tabular-nums text-neutral-400 md:text-base">
              Turn {roundNumber}
            </span>
          )}
        </div>
      </header>

      <div
        className="flex-1 gap-1.5 p-1.5"
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
                opponents={opponents}
                poison={poison[p.id] ?? 0}
                radiation={radiation[p.id] ?? 0}
                isCurrentTurn={p.id === currentTurnPlayerId}
                onChangeLife={(delta) => changeLife(p.id, delta)}
                onOpenElimination={() => setEliminationModalPlayerId(p.id)}
                onRevive={() => revivePlayer(p.id)}
                onRotate={() => rotatePlayer(p.id)}
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

      {eliminationModalPlayerId &&
        (() => {
          const p = players.find((pl) => pl.id === eliminationModalPlayerId);
          if (!p) return null;
          return (
            <EliminationModal
              playerName={p.name}
              rotation={rotations[p.id] ?? 0}
              onPick={(reason) => {
                eliminatePlayer(p.id, reason);
                setEliminationModalPlayerId(null);
              }}
              onCancel={() => setEliminationModalPlayerId(null)}
            />
          );
        })()}

      {showRandomizer && (
        <FirstPlayerRandomizer
          players={players}
          onPicked={setFirstPlayerId}
          onClose={handleRandomizerClose}
          closeLabel={currentTurnPlayerId === null ? "Start Game" : "Done"}
        />
      )}

      {showRerollConfirm && (
        <ConfirmModal
          title="Restart the game?"
          message="This resets everyone's life, damage, and counters back to a clean slate and re-rolls the first player."
          confirmLabel="Restart"
          onCancel={() => setShowRerollConfirm(false)}
          onConfirm={() => {
            setShowRerollConfirm(false);
            restartGame();
          }}
        />
      )}

      {showEndGame && (
        <EndGameModal
          players={players}
          saving={saving}
          error={saveError}
          gameStartedAt={gameStartedAt}
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
