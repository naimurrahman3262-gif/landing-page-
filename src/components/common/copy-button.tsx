"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  /** What is being copied, for the accessible name: "Copy referral link". */
  label: string;
  /** Show the "Copy" text next to the icon. */
  showText?: boolean;
}

export function CopyButton({
  value,
  label,
  showText = false,
  variant = "ghost",
  size,
  ...props
}: CopyButtonProps) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (showText ? "sm" : "icon-sm")}
      onClick={copy}
      aria-label={showText ? undefined : label}
      {...props}
    >
      {copied ? <Check aria-hidden className="text-success" /> : <Copy aria-hidden />}
      {showText && (copied ? t("copied") : t("copy"))}
      <span role="status" className="sr-only">
        {copied ? t("copied") : ""}
      </span>
    </Button>
  );
}
