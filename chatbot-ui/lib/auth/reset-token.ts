import { createHash, randomBytes } from "node:crypto";

// Der Klartext-Token landet ausschließlich im E-Mail-Link; in der Datenbank
// wird nur sein SHA-256-Hash gespeichert (siehe PasswordResetToken-Schema).
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 Stunde

export function generatePasswordResetToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
