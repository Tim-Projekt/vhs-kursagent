"use client";

import { useRouter } from "next/navigation";
import { suggestions } from "@/lib/constants";
import { FnrMark } from "./icons";

export function Preview() {
  const router = useRouter();

  const handleAction = (query?: string) => {
    const url = query ? `/?query=${encodeURIComponent(query)}` : "/";
    router.push(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-tl-md border-t border-l border-border/40 bg-background">
      <div className="flex h-14 shrink-0 items-center gap-2 bg-primary px-5 text-primary-foreground">
        <FnrMark size={16} />
        <span className="font-medium text-[13px] tracking-wide">
          FNR-Assistent
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Was möchten Sie wissen?
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Fragen zum gesamten FNR-Förderportfolio.
          </p>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-2">
          {suggestions.map((suggestion) => (
            <button
              className="rounded-md border border-border/30 bg-card/20 px-3 py-2.5 text-left text-[11px] leading-relaxed text-muted-foreground/70 transition-all duration-200 hover:border-border/60 hover:bg-card/40 hover:text-muted-foreground"
              key={suggestion}
              onClick={() => handleAction(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-5 pb-5">
        <button
          className="flex w-full items-center rounded-md border border-border/30 bg-card/30 px-4 py-3 text-left text-[13px] text-muted-foreground/40 transition-colors hover:border-border/50 hover:text-muted-foreground/60"
          onClick={() => handleAction()}
          type="button"
        >
          Frage stellen...
        </button>
      </div>
    </div>
  );
}
