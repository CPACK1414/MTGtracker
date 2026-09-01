import { getLiveGames } from "@/app/liveGameActions";
import LiveGamesBoardScreen from "@/components/LiveGamesBoardScreen";

export const dynamic = "force-dynamic";

export default async function LiveBoardPage() {
  const initial = await getLiveGames();
  return <LiveGamesBoardScreen initial={initial} />;
}
