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
    text: "Ich sitze den ganzen Tag am Rechner und mein Rücken merkt das – was tut mir nach Feierabend gut, ohne dass ich quer durch die Stadt fahren muss?",
    bereich: "Gesundheit",
    color: "var(--cat-gesundheit)",
  },
  {
    text: "Neu in Berlin, wohne in Neukölln und kenne kaum jemanden – gibt es Kurse, in denen man locker ins Gespräch kommt?",
    bereich: "Kultur",
    color: "var(--cat-kultur)",
  },
  {
    text: "Ich will mich nebenberuflich selbstständig machen, aber bei Buchhaltung und Steuern steige ich aus",
    bereich: "Arbeit & IT",
    color: "var(--cat-beruf)",
  },
  {
    text: "Ich möchte mich in meinem Kiez engagieren, weiß aber nicht, wo ich anfangen soll",
    bereich: "Gesellschaft",
    color: "var(--cat-politik)",
  },
];
