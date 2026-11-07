import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["en"] as const;
export const DEFAULT_LOCALE = "en";

/**
 * Locale resolution without URL prefixes (the portal is behind login).
 * Phase 3 reads the user's language preference cookie here; EN only for now.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
