export default function TournamentJoinCompleteScreen({ winnerName }: { winnerName: string | null }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-4xl">✅</p>
      <p className="text-xl font-bold text-white">Thanks for playing!</p>
      <p className="text-sm text-neutral-400">
        {winnerName ? `${winnerName} won this pod.` : "Your result has been recorded."} The
        tournament will continue on the organizer&apos;s phone.
      </p>
      <p className="mt-4 text-xs text-neutral-600">You can close this page.</p>
    </div>
  );
}
