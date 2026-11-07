"use client";

import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-card";
import { Field } from "@/components/common/field";
import { StepUpAuthDialog } from "@/components/common/step-up-auth-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAddPayoutMethod } from "@/lib/api/queries/funds";
import { AddPayoutInput } from "@/lib/api/schemas";
import { useApiErrorMessage, useValidationMessage } from "@/lib/hooks";
import { useUser } from "@/lib/user-context";

type Fields = Record<string, string>;

/**
 * Add a payout method (brief §6.5, §9). The ownership rule is shown up front,
 * inputs are validated with the same Zod schema as the BFF, and saving needs
 * step-up verification.
 */
export function PayoutMethodSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("funds.payout");
  const tc = useTranslations("common");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const user = useUser();
  const add = useAddPayoutMethod();
  const [type, setType] = useState<"bank" | "crypto">("bank");
  const [v, setV] = useState<Fields>({ network: "usdt-trc20" });
  const [errors, setErrors] = useState<Fields>({});
  const [formError, setFormError] = useState<string>();
  const [stepUp, setStepUp] = useState(false);
  const verifiedName = `${user.firstName} ${user.lastName}`;

  const input = () =>
    type === "bank"
      ? {
          type,
          methodId: "bank-inr",
          holderName: v.holderName ?? "",
          bankName: v.bankName ?? "",
          accountNumber: v.accountNumber ?? "",
          ifsc: v.ifsc ?? "",
        }
      : { type, methodId: v.network ?? "usdt-trc20", label: v.label ?? "", address: v.address ?? "" };

  function validate() {
    const parsed = AddPayoutInput.safeParse(input());
    const next: Fields = {};
    if (!parsed.success)
      for (const i of parsed.error.issues) next[String(i.path[0])] = vt(i.message) ?? i.message;
    // Ownership rule, checked before we even ask for a code.
    if (type === "bank" && v.holderName && v.holderName.trim().toLowerCase() !== verifiedName.toLowerCase()) {
      next.holderName = vt("holderNameMismatch")!;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(stepUpToken: string) {
    setFormError(undefined);
    try {
      await add.mutateAsync({ input: AddPayoutInput.parse(input()), stepUpToken });
      toast.success(t("success"));
      setV({ network: "usdt-trc20" });
      onOpenChange(false);
    } catch (e) {
      const { message, fields } = apiError(e);
      if (Object.keys(fields).length) setErrors(fields);
      else setFormError(message || t("error"));
    }
  }

  const field = (
    name: string,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
    hint?: string,
  ) => (
    <Field id={`po-${name}`} label={label} required error={errors[name]} hint={hint}>
      {(a) => (
        <Input
          {...a}
          {...props}
          value={v[name] ?? ""}
          onChange={(e) => setV({ ...v, [name]: e.target.value })}
        />
      )}
    </Field>
  );

  return (
    <>
      <Sheet open={open && !stepUp} onOpenChange={onOpenChange}>
        <SheetContent>
          <form
            method="post"
            noValidate
            className="flex h-full min-h-0 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              if (validate()) setStepUp(true);
            }}
          >
            <SheetHeader>
              <SheetTitle>{t("title")}</SheetTitle>
              <SheetDescription>{t("body")}</SheetDescription>
            </SheetHeader>
            <SheetBody className="grid content-start gap-4">
              <div className="flex gap-2 rounded-md bg-info-soft p-3 text-sm text-info-text" role="note">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t("ownership", { name: verifiedName })}
              </div>
              <FormAlert>{formError}</FormAlert>
              <SegmentedControl
                value={type}
                onValueChange={(x) => {
                  setType(x as "bank" | "crypto");
                  setErrors({});
                }}
                aria-label={t("type")}
                className="w-full"
              >
                <SegmentedControlItem value="bank" className="flex-1">
                  {t("bank")}
                </SegmentedControlItem>
                <SegmentedControlItem value="crypto" className="flex-1">
                  {t("crypto")}
                </SegmentedControlItem>
              </SegmentedControl>
              {type === "bank" ? (
                <>
                  {field("holderName", t("holderName"), { autoComplete: "name" })}
                  {field("bankName", t("bankName"))}
                  {field("accountNumber", t("accountNumber"), { inputMode: "numeric", autoComplete: "off" })}
                  {field("ifsc", t("ifsc"), { autoCapitalize: "characters", autoComplete: "off" })}
                </>
              ) : (
                <>
                  <Field id="po-network" label={t("network")} required>
                    {(a) => (
                      <Select value={v.network} onValueChange={(x) => setV({ ...v, network: x })}>
                        <SelectTrigger {...a}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usdt-trc20">USDT (TRC20)</SelectItem>
                          <SelectItem value="usdt-bep20">USDT (BEP20)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </Field>
                  {field("label", t("label"))}
                  {field("address", t("address"), {
                    autoComplete: "off",
                    spellCheck: false,
                    className: "font-mono",
                  })}
                  <p className="flex gap-2 text-sm text-warning-text">
                    <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> {t("addressHint")}
                  </p>
                </>
              )}
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" loading={add.isPending}>
                {t("submit")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      <StepUpAuthDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={t("stepUpAction")}
        onVerified={(tok) => void save(tok)}
      />
    </>
  );
}
