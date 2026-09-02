import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getCity, isKnownCity } from "@/lib/cities";

export default async function CityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ city: string }>;
}) {
  "use cache";
  const { city: slug } = await params;
  if (!isKnownCity(slug)) {
    notFound();
  }
  const city = getCity(slug);

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 py-6">
      <header className="flex items-center justify-between gap-4 border-b pb-4">
        <Link
          className="font-semibold text-lg tracking-tight"
          href={`/${city.slug}`}
        >
          VHS-Kursberater <span className="text-muted-foreground">{city.name}</span>
        </Link>
        <Link
          className="rounded-md border px-3 py-1.5 font-medium text-sm hover:bg-muted"
          href="/"
        >
          KI-Beratung starten
        </Link>
      </header>

      <main className="flex-1 py-8">{children}</main>

      <footer className="border-t pt-4 text-muted-foreground text-xs leading-relaxed">
        <p>
          Kursdaten: {city.data.sourceName} · Bereitgestellt von{" "}
          {city.data.attribution} · Lizenz {city.data.licenseLabel}. Kein
          offizielles Angebot der Volkshochschulen. Anmeldung und verbindliche
          Informationen bei der jeweiligen {city.providerLabel}.
        </p>
        <p className="mt-2 flex gap-3">
          <Link className="hover:underline" href="/impressum">
            Impressum
          </Link>
          <Link className="hover:underline" href="/datenschutz">
            Datenschutz
          </Link>
        </p>
      </footer>
    </div>
  );
}
