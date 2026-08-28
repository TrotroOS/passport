"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LegalFooter } from "@/components/legal/legal-footer";
import { PassportLogo } from "@/components/brand/passport-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { loginAction, type ActionResult } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations";
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

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth");
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t("signingIn") : t("signIn")}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : "/signup";

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

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
          <CardTitle>{t("welcomeBack")}</CardTitle>
          <CardDescription>{t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-4">
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SubmitButton />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href={signupHref} className="font-medium text-primary hover:underline">
              {t("signUp")}
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
