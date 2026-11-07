import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { BRAND } from "@/config/brand";
import { THEME_COOKIE } from "@/lib/auth/constants";
import { inter, satoshi } from "./fonts";
import { Providers } from "./providers";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    // G2: every route sets its own title → "{Page} — WinproFX".
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
  // Theme comes from a cookie so the server renders the right theme (no flash).
  const theme = (await cookies()).get(THEME_COOKIE)?.value === "light" ? "light" : "dark";
  return (
    <html lang={locale} data-theme={theme} className={`${satoshi.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-bg font-sans text-text-1 antialiased">
        <NextIntlClientProvider>
          <Providers timeZone="UTC">{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
