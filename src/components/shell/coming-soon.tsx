import { Construction, Hourglass } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { buttonVariants } from "@/components/ui/button";

/** A disabled module's route: friendly, inside the shell, never a dead end. */
export function ComingSoon({ title }: { title: string }) {
  const t = useTranslations("shell");
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={Hourglass}
        title={t("comingSoonTitle")}
        description={t("comingSoonBody", { feature: title })}
        action={
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {t("backHome")}
          </Link>
        }
      />
    </>
  );
}

/** Temporary body for routes whose screens arrive in a later phase. */
export function RouteStub({ title, backHref }: { title: string; backHref?: string }) {
  const t = useTranslations("shell");
  return (
    <>
      <PageHeader title={title} backHref={backHref} />
      <EmptyState icon={Construction} title={t("buildingTitle")} description={t("buildingBody")} />
    </>
  );
}
