import Link from "next/link";
import { ADMIN_RUNBOOK_COMMANDS, ADMIN_RUNBOOK_SECTIONS } from "@/lib/admin/runbook";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/types";

export function AdminRunbookView() {
  return (
    <div className="space-y-8">
      <nav className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">On this page</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {ADMIN_RUNBOOK_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-primary hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {ADMIN_RUNBOOK_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <h2 className="mb-3 text-xl font-semibold text-foreground">{section.title}</h2>
          {section.intro ? (
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{section.intro}</p>
          ) : null}
          {section.bullets?.length ? (
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-foreground/90">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
          {section.procedures?.map((procedure) => (
            <article
              key={procedure.id}
              id={procedure.id}
              className="mb-4 rounded-lg border border-border bg-card p-4"
            >
              <h3 className="font-semibold text-foreground">{procedure.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{procedure.summary}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                When
              </p>
              <p className="text-sm text-foreground/90">{procedure.when}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground/90">
                {procedure.steps.map((step) => (
                  <li key={step.label}>
                    {step.label}
                    {step.detail ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {step.detail}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
              {procedure.links?.length ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {procedure.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-primary hover:underline"
                    >
                      {link.label} →
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ))}

      <section id="quick-commands" className="scroll-mt-24">
        <h2 className="mb-3 text-xl font-semibold text-foreground">Quick command reference</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Command</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ADMIN_RUNBOOK_COMMANDS.map((row) => (
                <tr key={row.cmd}>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{row.cmd}</td>
                  <td className="px-4 py-3 text-foreground/90">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted/20 p-4">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Escalation</h2>
        <p className="text-sm text-muted-foreground">
          Customer-facing support:{" "}
          <a href={`mailto:${SUPPORT_CONTACT_EMAIL}`} className="text-primary hover:underline">
            {SUPPORT_CONTACT_EMAIL}
          </a>
          . For schema or auth emergencies, use Supabase dashboard SQL editor and verify migrations
          before manual data fixes. Document any production intervention in admin notes or internal
          changelog.
        </p>
      </section>
    </div>
  );
}
