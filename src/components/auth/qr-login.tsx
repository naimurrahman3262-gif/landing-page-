"use client";

import { LoaderCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { LINKS } from "@/config/links";
import { apiFetch } from "@/lib/api/client";
import { useCountdown } from "@/lib/hooks";
import { AuthHeading, FormAlert } from "./auth-card";
import { useAuthRedirect, type AuthStep } from "./login-form";

type QrStart = { qrId: string; payload: string; expiresInSeconds: number };
const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/** QR sign-in: 60 s code that refreshes itself; polls for approval from the app. */
export function QrLogin({ next }: { next: string }) {
  const t = useTranslations("auth.qr");
  const redirect = useAuthRedirect();
  const [qr, setQr] = useState<QrStart | null>(null);
  const [failed, setFailed] = useState(false);
  const [approved, setApproved] = useState(false);
  const { seconds, restart } = useCountdown(0);
  // Keep the latest redirect without re-subscribing the poller every render.
  const redirectRef = useRef(redirect);
  redirectRef.current = redirect;

  const start = useCallback(async () => {
    setFailed(false);
    setQr(null);
    try {
      const res = await apiFetch<QrStart>("/auth/qr/start", { method: "POST" });
      setQr(res);
      restart(res.expiresInSeconds);
    } catch {
      setFailed(true);
    }
  }, [restart]);

  useEffect(() => {
    void start();
  }, [start]);

  // Auto-refresh when the countdown runs out.
  useEffect(() => {
    if (qr && seconds === 0 && !approved) void start();
  }, [qr, seconds, approved, start]);

  // Poll for approval every 2 s.
  useEffect(() => {
    if (!qr || approved) return;
    const id = setInterval(async () => {
      const res = await apiFetch<{ status: string } | AuthStep>(
        `/auth/qr/${qr.qrId}?next=${encodeURIComponent(next)}`,
      ).catch(() => null);
      if (res && "step" in res) {
        setApproved(true);
        redirectRef.current(res);
      } else if (res && res.status === "expired") void start();
    }, 2000);
    return () => clearInterval(id);
  }, [qr, approved, next, start]);

  return (
    <>
      <AuthHeading title={t("heading", { brand: BRAND })} subtitle={t("body", { brand: BRAND })} />
      {approved && <FormAlert tone="success">{t("approved")}</FormAlert>}

      {failed ? (
        <ErrorState compact title={t("error")} onRetry={start} />
      ) : (
        <div className="grid justify-items-center gap-3">
          <div className="grid size-56 place-content-center rounded-lg bg-qr-bg p-3">
            {qr ? (
              <QRCodeSVG
                value={qr.payload}
                size={200}
                level="M"
                role="img"
                aria-label={t("alt", { brand: BRAND })}
                bgColor="transparent"
                fgColor="currentColor"
                className="text-qr-ink"
              />
            ) : (
              <LoaderCircle aria-label={t("refreshing")} className="size-6 animate-spin text-qr-ink" />
            )}
          </div>
          <p className="text-sm text-text-2 tabular" aria-live="polite">
            {qr ? t("expiresIn", { seconds }) : t("refreshing")}
          </p>
          {MOCKING && qr && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => apiFetch(`/auth/qr/${qr.qrId}/approve`, { method: "POST" })}
            >
              Simulate app approval (mock)
            </Button>
          )}
        </div>
      )}

      {(LINKS.appStore || LINKS.googlePlay) && (
        <div className="mt-6 grid gap-2 border-t border-border pt-4 text-center">
          <p className="text-sm text-text-2">{t("getApp")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {LINKS.appStore && (
              <a
                className="text-sm font-medium text-primary-text underline-offset-4 hover:underline"
                href={LINKS.appStore}
              >
                {t("appStore")}
              </a>
            )}
            {LINKS.googlePlay && (
              <a
                className="text-sm font-medium text-primary-text underline-offset-4 hover:underline"
                href={LINKS.googlePlay}
              >
                {t("googlePlay")}
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
