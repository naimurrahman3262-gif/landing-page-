"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FormAlert } from "@/components/auth/auth-card";
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

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Verb label: "Archive account", "Confirm transfer". */
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  error?: string;
  tone?: "primary" | "danger";
  children?: ReactNode;
}

/** Confirmation for irreversible or significant actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  error,
  tone = "primary",
  children,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {(error || children) && (
          <DialogBody>
            <FormAlert>{error}</FormAlert>
            {children}
          </DialogBody>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
