"use client";

import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CopyButton } from "@/components/common/copy-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api/client";
import { useUser } from "@/lib/user-context";
import { LanguageSelect } from "./language-select";

export function ProfileMenu() {
  const t = useTranslations();
  const user = useUser();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("shell.profileMenu")} className="rounded-full">
          <span className="grid size-8 place-content-center rounded-full bg-surface-3 font-display text-xs font-bold text-text-1">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <div className="grid gap-0.5 px-2 py-2">
          <p className="truncate font-display font-bold text-text-1">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-sm text-text-2">{user.email}</p>
        </div>
        {user.partnerCode && (
          <div className="mx-2 mb-2 flex items-center justify-between gap-2 rounded-md bg-surface-1 py-1 pr-1 pl-3">
            <span className="grid">
              <span className="text-xs text-text-3">{t("shell.partnerCode")}</span>
              <span className="font-display text-sm font-medium tabular">{user.partnerCode}</span>
            </span>
            <CopyButton value={user.partnerCode} label={t("shell.copyPartnerCode")} />
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/profile">
            <UserRound aria-hidden /> {t("shell.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/security">
            <ShieldCheck aria-hidden /> {t("shell.security")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-sm text-text-2">{t("shell.language")}</span>
          <LanguageSelect className="h-9" />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={signingOut}>
          <LogOut aria-hidden /> {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
