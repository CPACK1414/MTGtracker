import { notFound } from "next/navigation";
import GameApp from "@/components/GameApp";
import { getPodByToken, getPodPlayers } from "@/app/tournamentActions";

export const dynamic = "force-dynamic";

export default async function JoinPodPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const podInfo = await getPodByToken(token);
  if (!podInfo) notFound();

  if (podInfo.pod.status === "complete") {
    const winner = podInfo.pod.participants.find((p) => p.playerId === podInfo.pod.winnerPlayerId);
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center">
        <p className="text-4xl">✅</p>
        <p className="text-xl font-bold text-white">This pod is already done.</p>
        <p className="text-sm text-neutral-400">
          {winner ? `${winner.name} won.` : "A result has already been recorded."}
        </p>
      </div>
    );
  }

  const players = await getPodPlayers(token);
  return (
    <GameApp
      initialPlayers={players}
      initialTournamentPod={{
        podId: token,
        tournamentId: podInfo.tournamentId,
        organizerPlayerId: podInfo.organizerPlayerId,
        round: podInfo.pod.round,
        mode: "join",
        players,
      }}
    />
  );
}
