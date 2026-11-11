import { Inter, Cairo } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { isRtlLocale, type Locale } from "@/i18n/config";
import { messagesForPath } from "@/lib/i18n/client-messages";
import { AppProviders } from "@/components/providers/app-providers";
import { KeyboardShortcutsProvider } from "@/components/layout/keyboard-shortcuts";
import { buildRootMetadata } from "@/lib/seo/metadata";
import "./globals.css";

const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  preload: false,
});

export const metadata = buildRootMetadata();
export const preferredRegion = ["fra1"];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages, headerStore] = await Promise.all([
    getLocale(),
    getMessages(),
    headers(),
  ]);
  const resolvedLocale = locale as Locale;
  const pathname = headerStore.get("x-passport-path");
  const clientMessages = pathname
    ? messagesForPath(messages as Record<string, unknown>, pathname)
    : messages;
  const dir = isRtlLocale(resolvedLocale) ? "rtl" : "ltr";
  const fontClass = isRtlLocale(resolvedLocale)
    ? `${cairo.variable} font-[family-name:var(--font-cairo)]`
    : `${inter.variable} font-[family-name:var(--font-inter)]`;

  return (
    <html lang={resolvedLocale} dir={dir} suppressHydrationWarning>
      <body className={`${fontClass} overflow-x-hidden bg-white text-foreground`}>
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
        <AppProviders>
          <NextIntlClientProvider locale={resolvedLocale} messages={clientMessages}>
            <KeyboardShortcutsProvider>
              <div id="passport-app-shell" className="no-print">
                {children}
                <Toaster richColors position={isRtlLocale(resolvedLocale) ? "top-left" : "top-right"} />
              </div>
            </KeyboardShortcutsProvider>
          </NextIntlClientProvider>
        </AppProviders>
      </body>
    </html>
  );
}
