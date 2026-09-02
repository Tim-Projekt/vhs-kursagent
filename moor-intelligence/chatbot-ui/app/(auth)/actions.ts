"use server";

import { z } from "zod";

import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/lib/auth/reset-token";
import { guestRegex } from "@/lib/constants";
import {
  createPasswordResetToken,
  createUser,
  getUser,
  getUserById,
  getValidPasswordResetToken,
  invalidateActivePasswordResetTokens,
  markPasswordResetTokenUsed,
  updateUserPassword,
} from "@/lib/db/queries";
import { sendPasswordResetEmail } from "@/lib/email";

import { signIn } from "./auth";

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return { status: "user_exists" } as RegisterActionState;
    }
    await createUser(validatedData.email, validatedData.password);
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export type ForgotPasswordActionState = {
  status: "idle" | "in_progress" | "success" | "invalid_data";
};

const forgotPasswordFormSchema = z.object({
  email: z.string().email(),
});

export const requestPasswordReset = async (
  _: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> => {
  try {
    const { email } = forgotPasswordFormSchema.parse({
      email: formData.get("email"),
    });

    // Gast-Konten haben Pseudo-E-Mails (siehe guestRegex) und keinen
    // eigenen Zugang zum Zurücksetzen — für sie wird kein Token erzeugt.
    if (!guestRegex.test(email)) {
      const [existingUser] = await getUser(email);
      if (existingUser) {
        await invalidateActivePasswordResetTokens(existingUser.id);
        const { token, tokenHash } = generatePasswordResetToken();
        await createPasswordResetToken({
          userId: existingUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
        });
        await sendPasswordResetEmail({ to: existingUser.email, token });
      }
    }

    // Immer "success" zurückgeben — unabhängig davon, ob die E-Mail
    // existiert. Verhindert, dass sich registrierte Adressen erraten lassen.
    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    console.error("[password-reset] Request failed:", error);
    return { status: "success" };
  }
};

export type ResetPasswordActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "invalid_data"
    | "invalid_token";
};

const resetPasswordFormSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export const resetPassword = async (
  _: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> => {
  try {
    const { token, password } = resetPasswordFormSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
    });

    const tokenHash = hashPasswordResetToken(token);
    const resetToken = await getValidPasswordResetToken(tokenHash);

    if (!resetToken) {
      return { status: "invalid_token" };
    }

    await updateUserPassword({ userId: resetToken.userId, password });
    await markPasswordResetTokenUsed(resetToken.id);

    const targetUser = await getUserById(resetToken.userId);
    if (targetUser) {
      await signIn("credentials", {
        email: targetUser.email,
        password,
        redirect: false,
      });
    }

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    console.error("[password-reset] Reset failed:", error);
    return { status: "failed" };
  }
};
