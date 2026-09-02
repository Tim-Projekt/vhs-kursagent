import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LOCALES } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/config";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  return children;
}
