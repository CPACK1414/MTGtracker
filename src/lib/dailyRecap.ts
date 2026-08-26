import sgMail from "@sendgrid/mail";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games, gameParticipants, players, decks, dailyRecapSent } from "@/db/schema";
import { formatHoursMinutes } from "@/lib/format";

const DENVER_TZ = "America/Denver";
const FROM_ADDRESS = { email: "cpack14@gmail.com", name: "MTG Game Tracker" };

function denverDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DENVER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function denverTimeLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function denverDateLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  return formatHoursMinutes(seconds);
}

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

function eliminationLabel(reason: string | null): string {
  if (reason === "commanderDamage") return "commander damage";
  if (reason === "combatDamage") return "combat damage";
  if (reason === "poison") return "poison";
  if (reason === "scoop") return "scooped";
  return "eliminated";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type GameCard = {
  timeLabel: string;
  podSize: number;
  won: boolean;
  eliminationReason: string | null;
  placement: number | null;
  finalLife: number | null;
  deckLabel: string | null;
  opponentNames: string[];
  durationLabel: string;
};

function resultHeadline(card: GameCard): string {
  if (card.won) return "You won";
  if (card.eliminationReason) return `Eliminated — ${eliminationLabel(card.eliminationReason)}`;
  return "Game ended";
}

function buildRecapEmail(
  playerName: string,
  dateLabel: string,
  cards: GameCard[]
): { subject: string; html: string; text: string } {
  const subject = `Your MTG recap — ${dateLabel}`;
  const gameWord = cards.length === 1 ? "game" : "games";
  const headline =
    cards.length === 1 ? `One game tonight, ${playerName}.` : `${cards.length} games tonight, ${playerName}.`;

  const gameBlocksHtml = cards
    .map((card) => {
      const stripe = card.won ? "#34d399" : "#e2725a";
      const placementLabel = card.won
        ? "1st"
        : card.placement
        ? ordinal(card.placement)
        : "—";
      const opponents = card.opponentNames.length ? `vs. ${card.opponentNames.join(", ")}` : "";
      const deckLine = [card.deckLabel, opponents].filter(Boolean).join(" &middot; ");
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2c26;border-left:4px solid ${stripe};border-radius:10px;background:#1c1e1a;margin-bottom:14px;">
        <tr>
          <td style="padding:18px 20px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8d7e;">
                  Pod of ${card.podSize}
                </td>
                <td align="right" style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;color:#8a8d7e;">
                  ${escapeHtml(card.timeLabel)}
                </td>
              </tr>
            </table>
            <p style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:19px;margin:10px 0 4px;color:${stripe};">
              ${escapeHtml(resultHeadline(card))}
            </p>
            ${deckLine ? `<p style="font-size:13.5px;color:#9a9c8c;margin:0 0 16px;">${deckLine}</p>` : ""}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px dashed #33352d;padding-top:14px;">
              <tr>
                <td width="33%">
                  <p style="font-size:10.5px;letter-spacing:0.07em;text-transform:uppercase;color:#8a8d7e;margin:0 0 3px;">Final life</p>
                  <p style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:14px;color:#f0f1ea;margin:0;">${card.finalLife ?? "—"}</p>
                </td>
                <td width="33%">
                  <p style="font-size:10.5px;letter-spacing:0.07em;text-transform:uppercase;color:#8a8d7e;margin:0 0 3px;">Duration</p>
                  <p style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:14px;color:#f0f1ea;margin:0;">${card.durationLabel}</p>
                </td>
                <td width="34%">
                  <p style="font-size:10.5px;letter-spacing:0.07em;text-transform:uppercase;color:#8a8d7e;margin:0 0 3px;">Placement</p>
                  <p style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:14px;color:#f0f1ea;margin:0;">${placementLabel}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#111210;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111210;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#17181a;border:1px solid #2a2c26;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:30px 34px 22px;border-bottom:1px solid #2a2c26;">
              <p style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8d7e;margin:0 0 16px;">MTG Game Tracker</p>
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:26px;line-height:1.2;margin:0 0 8px;color:#f5f6f0;">${escapeHtml(headline)}</h1>
              <p style="font-size:15px;line-height:1.55;color:#a4a696;margin:0;max-width:46ch;">Here's how ${cards.length === 1 ? "it went" : "they went"} — full breakdown below.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 34px 8px;">
              ${gameBlocksHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 34px 30px;border-top:1px solid #2a2c26;">
              <p style="margin:0 0 8px;font-size:12.5px;line-height:1.6;color:#72756a;">You're getting this because you played on MTG Game Tracker today. Emailed once a day, only on days you play.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    headline,
    "",
    ...cards.map((card, i) => {
      const placementLabel = card.won ? "1st" : card.placement ? ordinal(card.placement) : "—";
      const opponents = card.opponentNames.length ? ` vs. ${card.opponentNames.join(", ")}` : "";
      return [
        `Game ${i + 1} · Pod of ${card.podSize} · ${card.timeLabel}`,
        `${resultHeadline(card)}${card.deckLabel ? ` — ${card.deckLabel}` : ""}${opponents}`,
        `Final life: ${card.finalLife ?? "—"}  Duration: ${card.durationLabel}  Placement: ${placementLabel}`,
        "",
      ].join("\n");
    }),
    `You played ${cards.length} ${gameWord} today on MTG Game Tracker.`,
  ].join("\n");

  return { subject, html, text };
}

export async function sendDailyRecaps(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const now = new Date();
  const todayKey = denverDateKey(now);
  const dateLabel = denverDateLabel(now);

  const [allGames, allParticipants, allPlayers, allDecks, alreadySentRows] = await Promise.all([
    db.select().from(games),
    db.select().from(gameParticipants),
    db.select().from(players),
    db.select().from(decks),
    db.select().from(dailyRecapSent).where(eq(dailyRecapSent.summaryDate, todayKey)),
  ]);

  const todaysGames = allGames.filter((g) => denverDateKey(g.playedAt) === todayKey);
  if (todaysGames.length === 0) {
    return { sent: 0, skipped: 0, errors: [] };
  }

  const gameIds = new Set(todaysGames.map((g) => g.id));
  const participantsByGame = new Map<string, (typeof allParticipants)[number][]>();
  for (const p of allParticipants) {
    if (!gameIds.has(p.gameId)) continue;
    const list = participantsByGame.get(p.gameId) ?? [];
    list.push(p);
    participantsByGame.set(p.gameId, list);
  }

  const playersById = new Map(allPlayers.map((p) => [p.id, p]));
  const decksById = new Map(allDecks.map((d) => [d.id, d]));
  const alreadySent = new Set(alreadySentRows.map((r) => r.playerId));

  const cardsByPlayer = new Map<string, GameCard[]>();
  for (const game of todaysGames) {
    const participants = participantsByGame.get(game.id) ?? [];
    for (const gp of participants) {
      const player = playersById.get(gp.playerId);
      if (!player) continue;
      const deck = gp.deckId ? decksById.get(gp.deckId) : undefined;
      const opponentNames = participants
        .filter((o) => o.playerId !== gp.playerId)
        .map((o) => playersById.get(o.playerId)?.name ?? "Unknown");
      const card: GameCard = {
        timeLabel: denverTimeLabel(game.playedAt),
        podSize: game.podSize,
        won: game.winnerPlayerId === gp.playerId,
        eliminationReason: gp.eliminationReason,
        placement: gp.placement,
        finalLife: gp.finalLife,
        deckLabel: deck?.commander || deck?.name || null,
        opponentNames,
        durationLabel: formatDuration(game.durationSeconds),
      };
      const list = cardsByPlayer.get(gp.playerId) ?? [];
      list.push(card);
      cardsByPlayer.set(gp.playerId, list);
    }
  }

  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey) sgMail.setApiKey(sendgridApiKey);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [playerId, cards] of cardsByPlayer) {
    const player = playersById.get(playerId);
    if (!player) continue;
    if (alreadySent.has(playerId)) {
      skipped++;
      continue;
    }
    if (!player.email) {
      skipped++;
      continue;
    }
    if (!sendgridApiKey) {
      errors.push("SENDGRID_API_KEY is not configured — no emails were sent.");
      break;
    }

    cards.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
    const { subject, html, text } = buildRecapEmail(player.name, dateLabel, cards);

    try {
      await sgMail.send({
        from: FROM_ADDRESS,
        to: player.email,
        subject,
        html,
        text,
      });
      await db
        .insert(dailyRecapSent)
        .values({ playerId, summaryDate: todayKey })
        .onConflictDoNothing();
      sent++;
    } catch (e) {
      errors.push(`${player.name}: ${e instanceof Error ? e.message : "send failed"}`);
    }
  }

  return { sent, skipped, errors };
}
