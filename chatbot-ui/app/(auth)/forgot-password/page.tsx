"use client";

import Form from "next/form";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ForgotPasswordActionState,
  requestPasswordReset,
} from "../actions";

export default function Page() {
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<ForgotPasswordActionState, FormData>(
    requestPasswordReset,
    { status: "idle" }
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: state.status is the only relevant dependency
  useEffect(() => {
    if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Bitte gib eine gültige E-Mail-Adresse ein.",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <>
      <h1 className="font-semibold text-2xl text-navy tracking-tight">
        Passwort vergessen
      </h1>
      <p className="text-muted-foreground text-sm">
        {isSuccessful
          ? "Falls es ein Konto mit dieser Adresse gibt, ist der Link unterwegs."
          : "Gib deine E-Mail-Adresse ein, wir schicken dir einen Link."}
      </p>

      {isSuccessful ? (
        <p className="text-center text-[13px] text-muted-foreground">
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/login"
          >
            Zurück zur Anmeldung
          </Link>
        </p>
      ) : (
        <Form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label
              className="font-normal text-muted-foreground"
              htmlFor="email"
            >
              E-Mail
            </Label>
            <Input
              autoComplete="email"
              autoFocus
              className="h-10 rounded-lg border-border/50 bg-muted/50 text-sm transition-colors focus:border-foreground/20 focus:bg-muted"
              defaultValue={email}
              id="email"
              name="email"
              placeholder="name@example.de"
              required
              type="email"
            />
          </div>

          <SubmitButton isSuccessful={isSuccessful}>
            Link zum Zurücksetzen senden
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
      )}
    </>
  );
}
