"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LegalFooter } from "@/components/legal/legal-footer";
import { PassportLogo } from "@/components/brand/passport-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { signupAction, type ActionResult } from "@/lib/actions/auth";
import { SignupAttributionFields } from "@/components/auth/signup-attribution-fields";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { signupSchema, type SignupInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const initialState: ActionResult = { success: false };

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("auth");
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? t("creatingAccount") : t("createAccount")}
    </Button>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(signupAction, initialState);
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const [termsAccepted, setTermsAccepted] = useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", fullName: "", acceptTerms: undefined },
  });

  useEffect(() => {
    if (state.error) {
      if (state.success) {
        toast.success(state.error);
      } else {
        toast.error(state.error);
      }
    }
  }, [state]);

  useEffect(() => {
    if (state.success && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state.success, state.redirectTo, router]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <div className="absolute end-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <PassportLogo width={220} />
          </div>
          <CardTitle>{t("createAccount")}</CardTitle>
          <CardDescription>{t("signupDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <span>
              {t("acceptTermsPrefix")}{" "}
              <Link
                href="/legal/terms-of-service"
                className="text-primary hover:underline"
                target="_blank"
              >
                {t("termsOfService")}
              </Link>
              {", "}
              <Link
                href="/legal/privacy-policy"
                className="text-primary hover:underline"
                target="_blank"
              >
                {t("privacyPolicy")}
              </Link>
              {", "}
              <Link
                href="/legal/acceptable-use"
                className="text-primary hover:underline"
                target="_blank"
              >
                {t("acceptableUse")}
              </Link>
              .
            </span>
          </label>
          <OAuthButtons next={next} intent="signup" acceptTerms={termsAccepted} />
          <Form {...form}>
            <form action={formAction} className="space-y-4">
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fullName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("fullNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("workEmail")}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t("emailPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("passwordPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Suspense fallback={null}>
                <SignupAttributionFields />
              </Suspense>
              <input type="hidden" name="acceptTerms" value={termsAccepted ? "on" : ""} />
              <SubmitButton disabled={!termsAccepted} />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href={loginHref} className="font-medium text-primary hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </CardFooter>
      </Card>
      <div className="mt-6 w-full max-w-md">
        <LegalFooter />
      </div>
    </div>
  );
}
