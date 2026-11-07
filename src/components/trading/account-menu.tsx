"use client";

import { Archive, ArrowLeftRight, FileText, History, KeyRound, MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { accountName } from "@/lib/accounts";
import type { Account } from "@/lib/api/schemas";
import { ArchiveDialog, LeverageDialog, Mt5PasswordDialog, RenameDialog } from "./account-dialogs";

type Open = null | "rename" | "leverage" | "password" | "archive";

/**
 * ⋯ menu, grouped (brief §6.3): Manage · View · Archive. No nested
 * "Quick actions" modal. Each action opens its own dialog.
 */
export function AccountMenu({ account, size = "icon-sm" }: { account: Account; size?: "icon" | "icon-sm" }) {
  const t = useTranslations("accounts");
  const [open, setOpen] = useState<Open>(null);
  const close = (o: boolean) => !o && setOpen(null);
  const editable = !account.archived && account.status !== "disabled";
  const archivable = !account.archived && account.equity === 0 && account.openPositions === 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={size} aria-label={t("more", { account: accountName(account) })}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{t("menu.manage")}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setOpen("rename")}>
              <Pencil aria-hidden /> {t("menu.rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!editable || account.kind === "demo"}
              onSelect={() => setOpen("leverage")}
            >
              <ArrowLeftRight aria-hidden /> {t("menu.leverage")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!editable} onSelect={() => setOpen("password")}>
              <KeyRound aria-hidden /> {t("menu.password")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("menu.view")}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/trading/accounts/${account.login}`}>
              <FileText aria-hidden /> {t("menu.details")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/trading/positions?account=${account.login}`}>
              <History aria-hidden /> {t("menu.positions")}
            </Link>
          </DropdownMenuItem>
          {!account.archived && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" disabled={!archivable} onSelect={() => setOpen("archive")}>
                <Archive aria-hidden /> {t("menu.archive")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog account={account} open={open === "rename"} onOpenChange={close} />
      <LeverageDialog account={account} open={open === "leverage"} onOpenChange={close} />
      <Mt5PasswordDialog account={account} open={open === "password"} onOpenChange={close} />
      <ArchiveDialog account={account} open={open === "archive"} onOpenChange={close} />
    </>
  );
}
