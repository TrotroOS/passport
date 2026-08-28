import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CircleHelp } from "lucide-react";
import { HelpContactActions } from "@/components/help/help-contact-actions";
import { USER_HELP_TOPICS } from "@/lib/help/user-help-topics";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/types";

interface UserHelpViewProps {
  showFeedback?: boolean;
}

export async function UserHelpView({ showFeedback = false }: UserHelpViewProps) {
  const t = await getTranslations("help");

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2 text-primary">
          <CircleHelp className="h-6 w-6" />
          <span className="text-sm font-medium">{t("eyebrow")}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("pageTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      <nav className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">{t("onThisPage")}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {USER_HELP_TOPICS.map((topic) => (
            <li key={topic.id}>
              <a href={`#${topic.id}`} className="text-primary hover:underline">
                {t(`topics.${topic.id}.title`)}
              </a>
            </li>
          ))}
          <li>
            <a href="#contact" className="text-primary hover:underline">
              {t("contactTitle")}
            </a>
          </li>
        </ul>
      </nav>

      {USER_HELP_TOPICS.map((topic) => {
        const steps = t.raw(`topics.${topic.id}.steps`) as string[];
        return (
          <section key={topic.id} id={topic.id} className="scroll-mt-24">
            <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                {t(`topics.${topic.id}.title`)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`topics.${topic.id}.summary`)}
              </p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {topic.link ? (
                <p className="mt-4 text-sm">
                  <Link href={topic.link.href} className="font-medium text-primary hover:underline">
                    {t(topic.link.labelKey)} →
                  </Link>
                </p>
              ) : null}
            </article>
          </section>
        );
      })}

      <section id="contact" className="scroll-mt-24 rounded-lg border border-border bg-muted/20 p-5">
        <h2 className="text-lg font-semibold text-foreground">{t("contactTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("contactBody")}</p>
        <p className="mt-3 text-sm">
          {t("contactEmailLabel")}{" "}
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
        </p>
        <div className="mt-4">
          <HelpContactActions showFeedback={showFeedback} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("disclaimer")}</p>
      </section>
    </div>
  );
}
