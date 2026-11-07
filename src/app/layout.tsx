import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { BRAND } from "@/config/brand";
import { inter, satoshi } from "./fonts";
import { Providers } from "./providers";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: BRAND, template: `%s — ${BRAND}` },
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme="dark" className={`${satoshi.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-bg font-sans text-text-1 antialiased">
        <NextIntlClientProvider>
          {/* Time zone comes from the user's preferences in Phase 3; UTC until then. */}
          <Providers timeZone="UTC">{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
