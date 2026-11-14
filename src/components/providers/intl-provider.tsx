"use client";

import { NextIntlClientProvider } from "next-intl";
import {
  handleIntlError,
  missingMessageFallback,
} from "@/lib/i18n/missing-message";

export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: React.ComponentProps<typeof NextIntlClientProvider>["messages"];
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={handleIntlError}
      getMessageFallback={missingMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
