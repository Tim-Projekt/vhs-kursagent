"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { type LoginActionState, login } from "../actions";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "failed") {
      toast({ type: "error", description: "Ungültige Anmeldedaten." });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Eingaben konnten nicht validiert werden.",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      updateSession();
      router.refresh();
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <>
      <h1 className="font-semibold text-2xl text-navy tracking-tight">
        Schön, dass du wieder da bist
      </h1>
      <p className="text-muted-foreground text-sm">
        Melde dich an, dann sind deine bisherigen Suchen wieder da.
      </p>
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>Anmelden</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            Passwort vergessen?
          </Link>
        </p>
        <p className="text-center text-[13px] text-muted-foreground">
          {"Noch kein Konto? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/register"
          >
            Registrieren
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
