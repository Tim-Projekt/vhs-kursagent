"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { type RegisterActionState, register } from "../actions";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ type: "error", description: "Konto existiert bereits." });
    } else if (state.status === "failed") {
      toast({ type: "error", description: "Konto konnte nicht erstellt werden." });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Eingaben konnten nicht validiert werden.",
      });
    } else if (state.status === "success") {
      toast({ type: "success", description: "Konto erfolgreich erstellt." });
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
      <h1 className="text-2xl font-semibold tracking-tight">
        Konto erstellen
      </h1>
      <p className="text-sm text-muted-foreground">
        Zugang für Mitarbeitende der FNR
      </p>
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>Registrieren</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {"Bereits ein Konto? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/login"
          >
            Anmelden
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
