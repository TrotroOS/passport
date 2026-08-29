"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { signInWithOAuthAction } from "@/lib/actions/oauth";
import { Button } from "@/components/ui/button";

interface OAuthButtonsProps {
  next?: string | null;
  intent?: "login" | "signup";
  acceptTerms?: boolean;
}

function OAuthSubmitButton({
  provider,
  label,
  disabled,
}: {
  provider: "google" | "apple";
  label: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      name="provider"
      value={provider}
      variant="outline"
      className="w-full"
      disabled={disabled || pending}
    >
      {label}
    </Button>
  );
}

export function OAuthButtons({ next, intent = "login", acceptTerms = true }: OAuthButtonsProps) {
  const t = useTranslations("auth");
  const disabled = intent === "signup" && !acceptTerms;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t("oauthOrContinueWith")}</span>
        </div>
      </div>

      <form action={signInWithOAuthAction} className="space-y-2">
        <input type="hidden" name="intent" value={intent} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {intent === "signup" && acceptTerms ? (
          <input type="hidden" name="acceptTerms" value="true" />
        ) : null}
        <OAuthSubmitButton
          provider="google"
          label={t("continueWithGoogle")}
          disabled={disabled}
        />
        <OAuthSubmitButton
          provider="apple"
          label={t("continueWithApple")}
          disabled={disabled}
        />
      </form>

      {disabled ? (
        <p className="text-center text-xs text-muted-foreground">{t("oauthTermsRequired")}</p>
      ) : null}
    </div>
  );
}
