import type { UserTier } from "@/app/(auth)/auth";

type Entitlements = {
  maxMessagesPerHour: number;
};

// Differenziert nach Tier statt nach Auth-Mechanismus: anonyme Gäste sind am
// stärksten limitiert (Missbrauchsschutz), angemeldete Nutzer:innen
// bekommen deutlich mehr Spielraum für iterative Multi-Themen-Recherchen
// (siehe systemPrompt in lib/ai/prompts.ts). "pro"/"admin" werden aktuell
// manuell über User.role in der Datenbank vergeben (kein Self-Service).
export const entitlementsByTier: Record<UserTier, Entitlements> = {
  guest: {
    maxMessagesPerHour: 10,
  },
  user: {
    maxMessagesPerHour: 40,
  },
  pro: {
    maxMessagesPerHour: 120,
  },
  admin: {
    maxMessagesPerHour: 300,
  },
};
