"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { PasswordField } from "@/components/common/password-field";
import { StepUpAuthDialog } from "@/components/common/step-up-auth-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { LINKS } from "@/config/links";
import { accountName } from "@/lib/accounts";
import {
  useArchiveAccount,
  useChangeLeverage,
  useChangeMt5Password,
  useLeverageOptions,
  useRenameAccount,
} from "@/lib/api/queries/accounts";
import { PASSWORD_RULES, type Account } from "@/lib/api/schemas";
import { formatAccountId, formatLeverage } from "@/lib/format";
import { useApiErrorMessage, useValidationMessage } from "@/lib/hooks";

type DialogProps = { account: Account; open: boolean; onOpenChange: (open: boolean) => void };

/* -------------------------------- rename ------------------------------- */

export function RenameDialog({ account, open, onOpenChange }: DialogProps) {
  const t = useTranslations("accounts.rename");
  const tc = useTranslations("common");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const rename = useRenameAccount(account.login);
  const [value, setValue] = useState(account.label ?? "");
  const [error, setError] = useState<string>();
  const tooLong = value.trim().length > 40;

  async function submit() {
    if (tooLong) return;
    setError(undefined);
    try {
      await rename.mutateAsync(value.trim());
      toast.success(t("success"));
      onOpenChange(false);
    } catch (e) {
      setError(apiError(e).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setValue(account.label ?? "");
        onOpenChange(o);
      }}
    >
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
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body", { account: formatAccountId(account.login) })}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FormAlert>{error}</FormAlert>
            <Field
              id="rename-label"
              label={t("label")}
              hint={t("hint", { account: formatAccountId(account.login) })}
              error={tooLong ? vt("labelTooLong") : undefined}
            >
              {(a) => (
                <Input
                  {...a}
                  value={value}
                  maxLength={60}
                  autoFocus
                  onChange={(e) => setValue(e.target.value)}
                />
              )}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" loading={rename.isPending} disabled={tooLong}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- leverage ------------------------------ */

export function LeverageDialog({ account, open, onOpenChange }: DialogProps) {
  const t = useTranslations("accounts.leverageDialog");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const options = useLeverageOptions(account.login, open);
  const change = useChangeLeverage(account.login);
  // No preselection (brief §6.3).
  const [choice, setChoice] = useState<string>("");
  const [accepted, setAccepted] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const [error, setError] = useState<string>();

  function reset(o: boolean) {
    if (o) {
      setChoice("");
      setAccepted(false);
      setError(undefined);
    }
    onOpenChange(o);
  }

  async function apply(stepUpToken: string) {
    setError(undefined);
    try {
      const next = await change.mutateAsync({ leverage: Number(choice), stepUpToken });
      toast.success(t("success", { leverage: formatLeverage(next.leverage) }));
      onOpenChange(false);
    } catch (e) {
      setError(apiError(e).message);
    }
  }

  const blocked = (options.data?.openPositions ?? 0) > 0;

  return (
    <>
      <Dialog open={open && !stepUp} onOpenChange={reset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{accountName(account)}</DialogDescription>
          </DialogHeader>
          {/* The body scrolls inside the dialog; the page never scrolls behind it. */}
          <DialogBody className="grid gap-4">
            <FormAlert>{error}</FormAlert>
            <div className="flex items-center justify-between rounded-md bg-surface-2 px-4 py-3">
              <span className="text-sm text-text-2">{t("current")}</span>
              <span className="font-display font-bold tabular">{formatLeverage(account.leverage)}</span>
            </div>

            {options.isPending && <Skeleton className="h-32" />}
            {options.isError && <FormAlert>{t("loadError")}</FormAlert>}

            {options.data && blocked && (
              <FormAlert>
                {t("blocked", { count: options.data.openPositions })}{" "}
                <Link
                  href={`/trading/positions?account=${account.login}`}
                  className="font-medium underline underline-offset-4"
                >
                  {t("viewPositions")}
                </Link>
              </FormAlert>
            )}

            {options.data && !blocked && (
              <>
                <fieldset className="grid gap-3">
                  <legend className="mb-3 text-sm font-medium">{t("choose")}</legend>
                  <RadioGroup
                    value={choice}
                    onValueChange={setChoice}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  >
                    {options.data.options.map((l) => (
                      <Label
                        key={l}
                        htmlFor={`lev-${l}`}
                        className="flex h-11 cursor-pointer items-center gap-3 rounded-md border border-border-input px-3 has-[[data-state=checked]]:border-primary-text has-[[data-state=checked]]:bg-primary-soft"
                      >
                        <RadioGroupItem id={`lev-${l}`} value={String(l)} />
                        <span className="font-display tabular">{formatLeverage(l)}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </fieldset>
                <div className="flex gap-3 rounded-md bg-warning-soft p-3 text-sm text-warning-text">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <p>{t("risk")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="lev-terms"
                    className="mt-0.5"
                    checked={accepted}
                    onCheckedChange={(v) => setAccepted(v === true)}
                  />
                  <div className="grid gap-1 text-sm">
                    <Label htmlFor="lev-terms" className="font-normal text-text-2">
                      {t("terms")}
                    </Label>
                    {LINKS.leverageTerms && (
                      <a
                        href={LINKS.leverageTerms}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-fit font-medium text-primary-text underline-offset-4 hover:underline"
                      >
                        {t("termsLink")}
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            {!blocked && (
              <Button
                disabled={!choice || !accepted}
                loading={change.isPending}
                onClick={() => setStepUp(true)}
              >
                {choice ? t("submit", { leverage: formatLeverage(Number(choice)) }) : t("submitIdle")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StepUpAuthDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={t("stepUpAction")}
        onVerified={(token) => void apply(token)}
      />
    </>
  );
}

/* ---------------------------- MT5 password ----------------------------- */

export function Mt5PasswordDialog({
  account,
  open,
  onOpenChange,
  initialType = "master",
}: DialogProps & { initialType?: "master" | "investor" }) {
  const t = useTranslations("accounts.passwordDialog");
  const tc = useTranslations("common");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const change = useChangeMt5Password(account.login);
  const [type, setType] = useState<"master" | "investor">(initialType);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const [error, setError] = useState<string>();

  const rulesOk = PASSWORD_RULES.every((r) => r.test(password));
  const matches = password === confirm;

  function reset(o: boolean) {
    if (o) {
      setType(initialType);
      setPassword("");
      setConfirm("");
      setTouched(false);
      setError(undefined);
    }
    onOpenChange(o);
  }

  async function apply(stepUpToken: string) {
    setError(undefined);
    try {
      await change.mutateAsync({ type, password, stepUpToken });
      toast.success(t("success", { type: type === "master" ? t("master") : t("investor") }));
      setPassword("");
      setConfirm("");
      onOpenChange(false);
    } catch (e) {
      setError(apiError(e).message);
    }
  }

  return (
    <>
      <Dialog open={open && !stepUp} onOpenChange={reset}>
        <DialogContent>
          <form
            method="post"
            noValidate
            className="flex min-h-0 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (rulesOk && matches) setStepUp(true);
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("body", { account: accountName(account) })}</DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4">
              <FormAlert>{error}</FormAlert>
              <div className="grid gap-2">
                <SegmentedControl
                  value={type}
                  onValueChange={(v) => setType(v as "master" | "investor")}
                  aria-label={t("type")}
                  className="w-full"
                >
                  <SegmentedControlItem value="master" className="flex-1">
                    {t("master")}
                  </SegmentedControlItem>
                  <SegmentedControlItem value="investor" className="flex-1">
                    {t("investor")}
                  </SegmentedControlItem>
                </SegmentedControl>
                <p className="text-sm text-text-3">
                  {type === "master" ? t("masterHint") : t("investorHint")}
                </p>
              </div>
              <Field
                id="mt5-new"
                label={t("new")}
                error={touched && !rulesOk ? vt("passwordRules") : undefined}
              >
                {(a) => (
                  <PasswordField
                    {...a}
                    autoComplete="new-password"
                    showRules
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </Field>
              <Field
                id="mt5-confirm"
                label={t("confirm")}
                error={touched && !matches ? vt("passwordMismatch") : undefined}
              >
                {(a) => (
                  <PasswordField
                    {...a}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                )}
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" loading={change.isPending}>
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <StepUpAuthDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={t("stepUpAction")}
        onVerified={(token) => void apply(token)}
      />
    </>
  );
}

/* -------------------------------- archive ------------------------------ */

export function ArchiveDialog({ account, open, onOpenChange }: DialogProps) {
  const t = useTranslations("accounts.archive");
  const apiError = useApiErrorMessage();
  const archive = useArchiveAccount(account.login);
  const [error, setError] = useState<string>();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        setError(undefined);
        onOpenChange(o);
      }}
      title={t("title", { account: accountName(account) })}
      description={t("body")}
      confirmLabel={t("submit")}
      tone="danger"
      pending={archive.isPending}
      error={error}
      onConfirm={async () => {
        try {
          await archive.mutateAsync();
          toast.success(t("success"));
          onOpenChange(false);
        } catch (e) {
          setError(apiError(e).message);
        }
      }}
    />
  );
}
