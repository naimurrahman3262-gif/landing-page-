import { CloudOff, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

/** Full-page state when the backend can't answer for a signed-in user (no redirect loop). */
export function BackendUnavailable() {
  const t = useTranslations("shell");
  return (
    <main className="grid min-h-dvh place-content-center px-4">
      <p className="mb-6 text-center font-display text-lg font-bold">{BRAND}</p>
      <EmptyState
        icon={CloudOff}
        title={t("unavailableTitle")}
        description={t("unavailableBody")}
        action={
          // A plain link reloads through middleware and the layout again.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/" className={buttonVariants({ variant: "outline" })}>
            <RotateCw aria-hidden /> {t("reload")}
          </a>
        }
      />
    </main>
  );
}
