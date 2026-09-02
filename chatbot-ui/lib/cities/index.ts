import { berlin } from "./berlin";
import type { City } from "./types";

export type { City } from "./types";

/** Alle aktiven Städte. Neue Stadt: hier ergänzen. */
export const CITIES: Record<string, City> = {
  berlin,
};

export const DEFAULT_CITY_SLUG = "berlin";

export function getCity(slug?: string | null): City {
  if (slug && CITIES[slug]) {
    return CITIES[slug];
  }
  return CITIES[DEFAULT_CITY_SLUG];
}

export function isKnownCity(slug?: string | null): slug is string {
  return Boolean(slug && CITIES[slug]);
}

export function listCities(): City[] {
  return Object.values(CITIES);
}
