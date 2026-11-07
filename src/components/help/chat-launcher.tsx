"use client";

import { MessageCircle, SendHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { FormAlert } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSendChat } from "@/lib/api/queries/account";
import type { ChatMessage } from "@/lib/api/schemas";
import { useFormatDate } from "@/lib/format-context";
import { useUiStore } from "@/lib/stores/ui";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";

/**
 * Live chat launcher (brief §6.11, G11): bottom-right, never auto-opens, hidden
 * while a stepper footer is mounted. Messages carry the current page (path only)
 * so the agent has context. Lives in the portal shell, so auth pages never show it.
 */
export function ChatLauncher() {
  const t = useTranslations("chat");
  const user = useUser();
  const pathname = usePathname();
  const fmt = useFormatDate();
  const open = useUiStore((s) => s.chatOpen);
  const setOpen = useUiStore((s) => s.setChatOpen);
  const hidden = useUiStore((s) => s.stickyBars > 0);
  const send = useSendChat();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, and React would call it as a cleanup.
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Phones: tuck the launcher away while scrolling down so it never sits on top
  // of what's being read; it comes back on scroll up and at the end of the page.
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 8;
      setTucked(y > last && y > 80 && !atEnd);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setError(undefined);
    const mine: ChatMessage = {
      id: `local-${Date.now()}`,
      author: "client",
      body,
      at: new Date().toISOString(),
    };
    setMessages((m) => [...m, mine]);
    setDraft("");
    try {
      const reply = await send.mutateAsync({ body, page: pathname });
      setMessages((m) => [...m, reply]);
    } catch {
      setError(t("error"));
      setMessages((m) => m.filter((x) => x.id !== mine.id));
      setDraft(body);
    }
  }

  return (
    <>
      {!hidden && !open && (
        <Button
          size="icon"
          className={cn(
            "fixed right-4 bottom-4 z-30 size-14 rounded-full shadow-2 transition-transform motion-reduce:transition-none md:right-6 md:bottom-6 md:translate-y-0",
            tucked && "translate-y-24",
          )}
          aria-label={t("open")}
          onClick={() => setOpen(true)}
        >
          <MessageCircle aria-hidden className="size-6!" />
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription>{t("body")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6" aria-live="polite">
            <ul className="grid gap-3">
              <Bubble author="support" body={t("greeting", { name: user.firstName })} />
              {messages.map((m) => (
                <Bubble key={m.id} author={m.author} body={m.body} at={fmt(m.at, "time")} />
              ))}
            </ul>
            <div ref={endRef} />
          </div>
          <SheetFooter className="block">
            <form method="post" noValidate onSubmit={submit} className="grid gap-2">
              <FormAlert>{error}</FormAlert>
              <div className="flex gap-2">
                <Input
                  aria-label={t("placeholder")}
                  placeholder={t("placeholder")}
                  value={draft}
                  maxLength={2000}
                  onChange={(e) => setDraft(e.target.value)}
                  size={1}
                  className="w-full"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label={t("send")}
                  loading={send.isPending}
                  disabled={!draft.trim()}
                >
                  <SendHorizontal aria-hidden />
                </Button>
              </div>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Bubble({ author, body, at }: { author: ChatMessage["author"]; body: string; at?: string }) {
  return (
    <li
      className={cn("grid max-w-4/5 gap-1", author === "client" ? "justify-self-end" : "justify-self-start")}
    >
      <p
        className={cn(
          "rounded-lg px-3 py-2 text-sm",
          author === "client" ? "bg-primary text-on-primary" : "bg-surface-2 text-text-1",
        )}
      >
        {body}
      </p>
      {at && <span className={cn("text-xs text-text-3", author === "client" && "text-right")}>{at}</span>}
    </li>
  );
}
