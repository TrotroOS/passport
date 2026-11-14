import { Inter, Cairo } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { isRtlLocale, type Locale } from "@/i18n/config";
import { AppProviders } from "@/components/providers/app-providers";
import { IntlProvider } from "@/components/providers/intl-provider";
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
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const resolvedLocale = locale as Locale;
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
          <IntlProvider locale={resolvedLocale} messages={messages}>
            <KeyboardShortcutsProvider>
              <div id="passport-app-shell" className="no-print">
                {children}
                <Toaster richColors position={isRtlLocale(resolvedLocale) ? "top-left" : "top-right"} />
              </div>
            </KeyboardShortcutsProvider>
          </IntlProvider>
        </AppProviders>
      </body>
    </html>
  );
}
