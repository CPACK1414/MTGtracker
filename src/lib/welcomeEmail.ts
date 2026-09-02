import sgMail from "@sendgrid/mail";
import { escapeHtml } from "@/lib/dailyRecap";

const FROM_ADDRESS = { email: "cpack14@gmail.com", name: "MTG Game Tracker" };
const APP_URL = "https://mtg-tracker-kappa.vercel.app";

// Best-effort — a failed/unconfigured send shouldn't block adding or
// editing a player, so this never throws. The boolean return just lets
// the UI show an accurate "sent" vs "couldn't send" confirmation.
export async function sendPlayerWelcomeEmail(name: string, email: string): Promise<boolean> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendgridApiKey) return false;
  sgMail.setApiKey(sendgridApiKey);

  const subject = "You've been added to MTG Game Tracker";

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
            <td style="padding:30px 34px 26px;">
              <p style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8d7e;margin:0 0 16px;">MTG Game Tracker</p>
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:24px;line-height:1.3;margin:0 0 14px;color:#f5f6f0;">You're in, ${escapeHtml(name)}.</h1>
              <p style="font-size:15px;line-height:1.6;color:#c4c6b8;margin:0 0 14px;max-width:46ch;">
                You've been added as a player on MTG Game Tracker. This email address (${escapeHtml(email)}) is what you'll use to sign in with Google.
              </p>
              <p style="margin:22px 0 0;">
                <a href="${APP_URL}" style="display:inline-block;background:#34d399;color:#0b3b2c;font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:10px;">Open MTG Game Tracker</a>
              </p>
              <p style="margin:22px 0 0;font-size:12.5px;line-height:1.6;color:#72756a;">
                Don't see this in your inbox next time? Check your spam or promotions folder, and mark it "not spam" so future emails land normally.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `You're in, ${name}.`,
    "",
    `You've been added as a player on MTG Game Tracker. This email address (${email}) is what you'll use to sign in with Google.`,
    "",
    APP_URL,
    "",
    `Don't see this in your inbox next time? Check your spam or promotions folder, and mark it "not spam" so future emails land normally.`,
  ].join("\n");

  try {
    await sgMail.send({ from: FROM_ADDRESS, to: email, subject, html, text });
    return true;
  } catch {
    return false;
  }
}
