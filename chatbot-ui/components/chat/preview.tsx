"use client";

import { useRouter } from "next/navigation";
import { suggestions } from "@/lib/constants";
import { KursspotMark } from "./icons";

export function Preview() {
  const router = useRouter();

  const handleAction = (query?: string) => {
    const url = query ? `/?query=${encodeURIComponent(query)}` : "/";
    router.push(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-tl-md border-t border-l border-border/40 bg-background">
      <div className="flex h-14 shrink-0 items-center gap-2 border-border border-b bg-background px-5 text-foreground">
        <span className="text-primary">
          <KursspotMark size={16} />
        </span>
        <span className="font-semibold text-[13px] tracking-wide">
          kursspot
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <div className="text-center">
          <h2 className="font-semibold text-2xl text-navy tracking-tight">
            Was willst du lernen?
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Sag, worauf du Lust hast.
          </p>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-2.5">
          {suggestions.map((suggestion) => (
            <button
              className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
              key={suggestion.text}
              onClick={() => handleAction(suggestion.text)}
              type="button"
            >
              <span
                aria-hidden
                className="mt-1 size-2 shrink-0 rounded-full"
                style={{ background: suggestion.color }}
              />
              <span className="text-[12px] text-foreground leading-snug">
                {suggestion.text}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-5 pb-5">
        <button
          className="flex w-full items-center rounded-lg border border-border bg-card px-4 py-3 text-left text-[13px] text-muted-foreground/70 transition-colors hover:border-primary/40 hover:text-muted-foreground"
          onClick={() => handleAction()}
          type="button"
        >
          Frag mich etwas …
        </button>
      </div>
    </div>
  );
}
