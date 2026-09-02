"use client";

import Form from "next/form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useState } from "react";

import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ResetPasswordActionState, resetPassword } from "../actions";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<ResetPasswordActionState, FormData>(
    resetPassword,
    { status: "idle" }
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: router is a stable ref
  useEffect(() => {
    if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
      });
    } else if (state.status === "invalid_token") {
      toast({
        type: "error",
        description:
          "Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
      });
    } else if (state.status === "failed") {
      toast({
        type: "error",
        description: "Passwort konnte nicht zurückgesetzt werden.",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      toast({ type: "success", description: "Passwort erfolgreich geändert." });
      router.push("/");
      router.refresh();
    }
  }, [state.status]);

  if (!token) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">
          Link ungültig
        </h1>
        <p className="text-sm text-muted-foreground">
          Dieser Link zum Zurücksetzen enthält keinen gültigen Token. Bitte
          fordere einen neuen Link an.
        </p>
        <p className="text-center text-[13px] text-muted-foreground">
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            Neuen Link anfordern
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Neues Passwort vergeben
      </h1>
      <p className="text-sm text-muted-foreground">
        Wähle ein neues Passwort für dein FNR-Konto.
      </p>
      <Form action={formAction} className="flex flex-col gap-4">
        <input name="token" type="hidden" value={token} />
        <div className="flex flex-col gap-2">
          <Label className="font-normal text-muted-foreground" htmlFor="password">
            Neues Passwort
          </Label>
          <Input
            autoComplete="new-password"
            autoFocus
            className="h-10 rounded-lg border-border/50 bg-muted/50 text-sm transition-colors focus:border-foreground/20 focus:bg-muted"
            id="password"
            minLength={6}
            name="password"
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            required
            type="password"
          />
        </div>

        <SubmitButton isSuccessful={isSuccessful}>
          Passwort zurücksetzen
        </SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/login"
          >
            Zurück zur Anmeldung
          </Link>
        </p>
      </Form>
    </>
  );
}
