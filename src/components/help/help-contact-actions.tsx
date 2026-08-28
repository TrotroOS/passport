"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { Button } from "@/components/ui/button";

interface HelpContactActionsProps {
  showFeedback: boolean;
}

export function HelpContactActions({ showFeedback }: HelpContactActionsProps) {
  const t = useTranslations("help");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showFeedback ? (
        <>
          <FeedbackButton />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">{t("backToDashboard")}</Link>
          </Button>
        </>
      ) : (
        <>
          <Button variant="default" size="sm" asChild>
            <Link href="/login">{t("links.signIn")}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/signup">{t("signUp")}</Link>
          </Button>
        </>
      )}
    </div>
  );
}
