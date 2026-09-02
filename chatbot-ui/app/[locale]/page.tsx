import { permanentRedirect } from "next/navigation";
import { DEFAULT_CITY_SLUG } from "@/lib/cities";
import { isLocale } from "@/lib/i18n/config";

/** Bare /de or /en → city landing. (Ein Städte-Picker kommt später.) */
export default async function LocaleIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : "de";
  permanentRedirect(`/${l}/${DEFAULT_CITY_SLUG}`);
}
