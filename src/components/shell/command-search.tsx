"use client";

import { Command } from "cmdk";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CornerDownLeft,
  FilePlus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { NavGroup } from "@/config/nav";

/**
 * ⌘K / Ctrl+K global search. Pages and quick actions now; accounts,
 * transactions and help articles plug in as their APIs land (Phases 4–6).
 */
export function CommandSearch({
  groups,
  open,
  onOpenChange,
}: {
  groups: NavGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href as never);
  }

  const actions = [
    { key: "deposit", href: "/funds/deposit", icon: ArrowDownToLine },
    { key: "withdraw", href: "/funds/withdraw", icon: ArrowUpFromLine },
    { key: "transfer", href: "/funds/transfer", icon: ArrowLeftRight },
    { key: "openAccount", href: "/trading/accounts/new", icon: FilePlus },
  ].filter((a) => groups.some((g) => g.items.some((i) => i.href === a.href)));

  const item =
    "flex min-h-11 cursor-default items-center gap-3 rounded-sm px-3 text-sm text-text-1 data-[selected=true]:bg-surface-3 [&_svg]:size-4 [&_svg]:text-text-3";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-w-xl translate-y-0 overflow-hidden p-0 sm:top-24" hideClose>
        <DialogTitle className="sr-only">{t("shell.search")}</DialogTitle>
        <DialogDescription className="sr-only">{t("shell.searchPlaceholder")}</DialogDescription>
        <Command label={t("shell.search")} className="flex max-h-dialog flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search aria-hidden className="size-5 shrink-0 text-text-3" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t("shell.searchPlaceholder")}
              className="h-14 w-full bg-transparent text-base text-text-1 outline-none placeholder:text-text-3"
            />
          </div>
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-text-2">
              {t("shell.searchEmpty", { query })}
            </Command.Empty>
            {actions.length > 0 && (
              <Command.Group
                heading={t("shell.searchActions")}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-3"
              >
                {actions.map((a) => (
                  <Command.Item
                    key={a.key}
                    value={`action ${t(`nav.${a.key}`)}`}
                    onSelect={() => go(a.href)}
                    className={item}
                  >
                    <a.icon aria-hidden />
                    <span className="flex-1">{t(`nav.${a.key}`)}</span>
                    <CornerDownLeft aria-hidden />
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <Command.Group
              heading={t("shell.searchPages")}
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-3"
            >
              {groups.flatMap((g) =>
                g.items.map((i) => (
                  <Command.Item
                    key={i.href}
                    value={`${t(`nav.${g.key}`)} ${t(`nav.${i.key}`)} ${i.href}`}
                    onSelect={() => go(i.href)}
                    className={item}
                  >
                    <span className="flex-1">{t(`nav.${i.key}`)}</span>
                    <span className="text-xs text-text-3">{t(`nav.${g.key}`)}</span>
                  </Command.Item>
                )),
              )}
            </Command.Group>
          </Command.List>
          <p className="border-t border-border px-4 py-3 text-xs text-text-3">{t("shell.searchHint")}</p>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
