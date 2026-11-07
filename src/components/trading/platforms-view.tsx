"use client";

import { Apple, AppWindow, Globe, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { PageHeader } from "@/components/common/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { MT5_DOWNLOADS } from "@/config/links";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "windows", icon: AppWindow, mobile: false },
  { id: "macos", icon: Apple, mobile: false },
  { id: "ios", icon: Smartphone, mobile: true },
  { id: "android", icon: Smartphone, mobile: true },
  { id: "web", icon: Globe, mobile: false },
] as const;

/** Platforms (brief §6.4): MT5 downloads, with a QR for phones when on desktop. No marketing claims. */
export function PlatformsView() {
  const t = useTranslations("platforms");
  const available = PLATFORMS.filter((p) => MT5_DOWNLOADS[p.id]);

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {available.map(({ id, icon: Icon, mobile }) => {
          const href = MT5_DOWNLOADS[id]!;
          return (
            <li key={id}>
              <Card className="flex h-full flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-content-center rounded-md bg-surface-3 text-text-2">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <CardTitle>{t(id)}</CardTitle>
                </div>
                {mobile && (
                  <div className="hidden items-center gap-3 md:flex">
                    <div className="rounded-md bg-qr-bg p-2">
                      <QRCodeSVG
                        value={href}
                        size={96}
                        role="img"
                        aria-label={t("qrAlt", { platform: t(id) })}
                        bgColor="transparent"
                        fgColor="currentColor"
                        className="text-qr-ink"
                      />
                    </div>
                    <p className="text-sm text-text-2">{t("scan")}</p>
                  </div>
                )}
                <a
                  href={href}
                  target={id === "web" || mobile ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: id === "web" ? "primary" : "outline" }),
                    "mt-auto w-full",
                  )}
                >
                  {id === "web" ? <Monitor aria-hidden /> : null}
                  {id === "web" ? t("open") : t("download")}
                </a>
              </Card>
            </li>
          );
        })}
      </ul>
      <Card className="grid gap-2 text-sm text-text-2">
        <p>{t("note")}</p>
        <Link
          href="/help/articles/connect-mt5"
          className="w-fit font-medium text-primary-text underline-offset-4 hover:underline"
        >
          {t("connectGuide")}
        </Link>
      </Card>
    </div>
  );
}
