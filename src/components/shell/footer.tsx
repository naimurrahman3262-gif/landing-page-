import { useTranslations } from "next-intl";
import { BRAND } from "@/config/brand";
import { LEGAL } from "@/config/legal";
import { LINKS } from "@/config/links";
import { cn } from "@/lib/utils";

/**
 * G1: one risk line, legal links, registered details from config and an
 * automatic © year. Any detail not yet supplied is simply omitted, never a placeholder.
 */
export function Footer({ className }: { className?: string }) {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();
  const links = [
    { href: LINKS.privacy, label: t("privacy") },
    { href: LINKS.terms, label: t("terms") },
    { href: LINKS.riskDisclosure, label: t("riskDisclosure") },
  ].filter((l): l is { href: string; label: string } => !!l.href);
  const registered = [
    LEGAL.registeredName,
    LEGAL.registeredAddress,
    LEGAL.licenceNumber && t("licence", { number: LEGAL.licenceNumber }),
    LEGAL.regulator && t("regulatedBy", { regulator: LEGAL.regulator }),
  ].filter(Boolean);

  return (
    <footer className={cn("grid gap-3 border-t border-border pt-6 text-xs text-text-3", className)}>
      {LEGAL.riskLine && <p className="text-text-2">{LEGAL.riskLine}</p>}
      {LEGAL.riskDisclosureFull && (
        <details className="group">
          <summary className="w-fit cursor-pointer rounded-sm text-text-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-focus-ring">
            {t("fullRisk")}
          </summary>
          <p className="mt-2 max-w-3xl leading-relaxed">{LEGAL.riskDisclosureFull}</p>
        </details>
      )}
      {registered.length > 0 && <p>{registered.join(" · ")}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p>{t("copyright", { year, brand: BRAND })}</p>
        {links.length > 0 && (
          <nav aria-label={t("legal")} className="flex flex-wrap gap-x-4 gap-y-2">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm text-text-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
