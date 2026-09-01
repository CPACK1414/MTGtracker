import { notFound } from "next/navigation";
import { getTournamentLiveState } from "@/app/tournamentActions";
import LiveResultsScreen from "@/components/LiveResultsScreen";

export const dynamic = "force-dynamic";

export default async function TournamentLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initial = await getTournamentLiveState(id);
  if (!initial) notFound();
  return <LiveResultsScreen tournamentId={id} initial={initial} />;
}
