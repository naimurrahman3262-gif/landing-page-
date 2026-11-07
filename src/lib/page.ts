import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** G2: page <title> from the nav label → "{Page} — WinproFX" via the root template. */
export async function navMetadata(key: string): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t(key as "home") };
}
