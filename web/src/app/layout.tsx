import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import {
  getActiveLocales,
  getDictionary,
  getLocale,
  getLocaleMeta,
  getServerT,
} from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const noto = Noto_Sans_Arabic({
  variable: "--font-noto",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const meta = await getLocaleMeta(locale);
  const dict = await getDictionary(locale);
  const locales = await getActiveLocales();

  return (
    <html
      lang={locale}
      dir={meta.direction}
      className={cn("h-full", noto.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <I18nProvider
          locale={locale}
          direction={meta.direction}
          dict={dict}
          locales={locales}
        >
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
