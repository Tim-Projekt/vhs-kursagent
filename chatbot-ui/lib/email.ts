import "server-only";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? "no-reply@fnr.de";
const FROM_NAME = process.env.BREVO_FROM_NAME ?? "kursspot";

function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function sendPasswordResetEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}) {
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${token}`;
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    // Kein E-Mail-Provider konfiguriert (z. B. lokale Entwicklung ohne
    // BREVO_API_KEY) — Link stattdessen loggen, damit der Flow trotzdem
    // manuell testbar bleibt, statt hart zu fehlschlagen.
    console.warn(
      `[email] BREVO_API_KEY nicht gesetzt — Passwort-Reset-Link für ${to}:\n${resetUrl}`
    );
    return;
  }

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject: "Passwort zurücksetzen – kursspot",
      htmlContent: `
        <p>Hallo,</p>
        <p>für dein kursspot-Konto wurde ein Zurücksetzen des Passworts angefordert. Klicke auf den folgenden Link, um ein neues Passwort zu vergeben:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Der Link ist 1 Stunde gültig. Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren — es ändert sich nichts an deinem Konto.</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 200)}`);
  }
}
