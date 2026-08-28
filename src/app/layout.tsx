import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { isRtlLocale, type Locale } from "@/i18n/config";
import { AppProviders } from "@/components/providers/app-providers";
import { KeyboardShortcutsProvider } from "@/components/layout/keyboard-shortcuts";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Passport — Trade Compliance Platform",
  description:
    "Trade document verification, regulatory checks, shipment collaboration, and compliance reporting.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const fontClass = isRtlLocale(locale)
    ? `${cairo.variable} font-[family-name:var(--font-cairo)]`
    : `${inter.variable} font-[family-name:var(--font-inter)]`;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${fontClass} bg-background text-foreground`}>
        <AppProviders>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <KeyboardShortcutsProvider>
              {children}
              <Toaster richColors position={isRtlLocale(locale) ? "top-left" : "top-right"} />
            </KeyboardShortcutsProvider>
          </NextIntlClientProvider>
        </AppProviders>
      </body>
    </html>
  );
}
