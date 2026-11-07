"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FormAlert } from "@/components/auth/auth-card";
import { OtpInput } from "@/components/common/otp-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStepUp } from "@/lib/api/queries/trading";
import { useApiErrorMessage } from "@/lib/hooks";

export interface StepUpAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Verb phrase for the copy: "change leverage", "confirm this withdrawal". */
  action: string;
  /** Receives a short-lived, single-use token to send with the sensitive request. */
  onVerified: (stepUpToken: string) => void;
}

/**
 * Step-up verification (brief §9) before MT5 password change, leverage change,
 * withdrawal, adding a payout method, disabling 2FA and changing email.
 * Authenticator code by default, email OTP as fallback.
 */
export function StepUpAuthDialog({ open, onOpenChange, action, onVerified }: StepUpAuthDialogProps) {
  const t = useTranslations("stepUp");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const { start, verify } = useStepUp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setCode("");
      setError(undefined);
      start.mutate(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per opening
  }, [open]);

  async function submit(value = code) {
    if (value.length !== 6) return;
    setError(undefined);
    try {
      const res = await verify.mutateAsync(value);
      onOpenChange(false);
      onVerified(res.stepUpToken);
    } catch (e) {
      setError(apiError(e).message);
      setCode("");
    }
  }

  const method = start.data?.method;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form
          method="post"
          noValidate
          className="flex min-h-0 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <span className="mb-1 grid size-10 place-content-center rounded-full bg-primary-soft text-primary-text">
              <ShieldCheck aria-hidden className="size-5" />
            </span>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {method === "email"
                ? t("bodyEmail", { email: start.data?.sentTo ?? "", action })
                : method === "totp"
                  ? t("bodyTotp", { action })
                  : t("starting")}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            {start.isError && <FormAlert>{t("startError")}</FormAlert>}
            <FormAlert>{error}</FormAlert>
            <OtpInput
              aria-label={t("code")}
              value={code}
              onChange={setCode}
              onComplete={submit}
              invalid={!!error}
              autoFocus
            />
            {method === "totp" && (
              <Button
                type="button"
                variant="link"
                className="justify-self-start"
                onClick={() => start.mutate("email")}
              >
                {t("useEmail")}
              </Button>
            )}
            {method === "email" && (
              <Button
                type="button"
                variant="link"
                className="justify-self-start"
                loading={start.isPending}
                onClick={() => start.mutate("email")}
              >
                {t("resend")}
              </Button>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" loading={verify.isPending} disabled={code.length !== 6}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
