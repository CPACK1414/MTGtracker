import GameApp from "@/components/GameApp";
import { getPlayersWithDecks } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialPlayers = await getPlayersWithDecks();
  return <GameApp initialPlayers={initialPlayers} />;
}
