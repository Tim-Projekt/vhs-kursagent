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

export const suggestions = [
  "Was hat die FNR im Bereich Paludikultur und Torfersatz bisher gefördert und was sind die zentralen Erkenntnisse?",
  "Welche Projekte des Waldklimafonds adressieren die Anpassung an den Klimawandel und mit welchen Ansätzen?",
  "Wie entwickelt sich die FNR-Förderung im Bereich Biokunststoffe und Biowerkstoffe — Trends, Lücken, Transferpotenziale?",
  "Wo gibt es bereichsübergreifende Synergien zwischen Bioenergie- und Biowerkstoff-Projekten im FNR-Portfolio?",
];
