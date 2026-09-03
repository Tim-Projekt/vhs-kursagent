import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

/** Startvorschläge, sortiert nach vhs-Programmbereich. Die Farbe ist die des
 *  jeweiligen Bereichs (siehe --cat-* in globals.css) und taucht als Punkt am
 *  Vorschlag wieder auf. */
export const suggestions = [
  {
    text: "Spanisch für Anfänger, am liebsten abends",
    bereich: "Sprachen",
    color: "var(--cat-sprachen)",
  },
  {
    text: "Yoga am Wochenende in meiner Nähe",
    bereich: "Gesundheit",
    color: "var(--cat-gesundheit)",
  },
  {
    text: "Excel lernen neben dem Job",
    bereich: "Arbeit & IT",
    color: "var(--cat-beruf)",
  },
  {
    text: "Fotografieren lernen ohne Vorkenntnisse",
    bereich: "Kultur",
    color: "var(--cat-kultur)",
  },
];
