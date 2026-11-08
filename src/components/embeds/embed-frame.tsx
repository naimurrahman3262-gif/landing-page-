"use client";

import { ExternalLink, Maximize2, RefreshCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface EmbedFrameProps {
  /** Third-party URL. `null` while it's being prepared (e.g. SSO handoff). */
  src: string | null;
  /** Accessible name for the iframe and the header. */
  title: string;
  /** Failure before the frame exists (e.g. the SSO handoff returned 403). */
  error?: boolean;
  /** Called by Refresh / Try again. Defaults to reloading the same URL. */
  onReload?: () => void;
  /** Give up and show the error state after this long. */
  timeoutMs?: number;
  /** Fixed height when the provider doesn't report one. Defaults to the viewport. */
  className?: string;
  /** Hide the Refresh · Fullscreen · Open in new tab bar (e.g. a feed widget). */
  bare?: boolean;
}

/**
 * G17: every third-party embed sits in this frame. Loading skeleton, a timeout
 * that turns into an error state with "Open in new tab", and one header pattern:
 * Refresh · Fullscreen · Open in new tab. Providers that post
 * `{ type: "wpx:embed-height", height }` get auto-height; others fill the viewport.
 */
export function EmbedFrame({
  src,
  title,
  error,
  onReload,
  timeoutMs = 12_000,
  className,
  bare,
}: EmbedFrameProps) {
  const t = useTranslations("embed");
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "timeout">("loading");
  const [nonce, setNonce] = useState(0);
  const [height, setHeight] = useState<number | null>(null);

  // Start (or restart) the timeout whenever a new URL is loaded.
  useEffect(() => {
    if (!src) return;
    setState("loading");
    const id = setTimeout(() => setState((s) => (s === "loading" ? "timeout" : s)), timeoutMs);
    return () => clearTimeout(id);
  }, [src, nonce, timeoutMs]);

  // Auto-height from providers that report it, accepted only from this frame.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as { type?: string; height?: unknown };
      if (
        d?.type === "wpx:embed-height" &&
        typeof d.height === "number" &&
        d.height > 0 &&
        d.height < 20_000
      ) {
        setHeight(Math.ceil(d.height));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const reload = useCallback(() => {
    setHeight(null);
    if (onReload) onReload();
    else setNonce((n) => n + 1);
  }, [onReload]);

  const failed = error || state === "timeout";
  const absolute = src;

  return (
    <section
      ref={wrapRef}
      aria-label={title}
      className="fullscreen:rounded-none fullscreen:border-0 grid overflow-hidden rounded-lg border border-border bg-surface-1"
    >
      {!bare && (
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <span className="min-w-0 flex-1 truncate px-2 text-sm font-medium">{title}</span>
          <Button variant="ghost" size="icon" aria-label={t("refresh")} onClick={reload}>
            <RefreshCw aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("fullscreen")}
            onClick={() => void wrapRef.current?.requestFullscreen?.().catch(() => undefined)}
            disabled={failed || !src}
          >
            <Maximize2 aria-hidden />
          </Button>
          {absolute ? (
            <a
              href={absolute}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("newTab")}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <ExternalLink aria-hidden />
            </a>
          ) : (
            <Button variant="ghost" size="icon" aria-label={t("newTab")} disabled>
              <ExternalLink aria-hidden />
            </Button>
          )}
        </div>
      )}

      <div className={cn("relative h-embed", className)} style={height ? { height } : undefined}>
        {failed ? (
          <div
            role="alert"
            className="grid h-full place-content-center justify-items-center gap-3 p-6 text-center"
          >
            <TriangleAlert aria-hidden className="size-8 text-warning-text" />
            <p className="font-display font-bold">{t("errorTitle", { name: title })}</p>
            <p className="max-w-sm text-sm text-text-2">{error ? t("errorBody") : t("timeoutBody")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={reload}>
                {t("retry")}
              </Button>
              {absolute && (
                <a href={absolute} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
                  <ExternalLink aria-hidden /> {t("newTab")}
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
            {state === "loading" && (
              <div
                className="absolute inset-0 grid gap-3 p-4"
                aria-busy="true"
                aria-label={t("loading", { name: title })}
              >
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-full" />
              </div>
            )}
            {src && (
              <iframe
                key={`${src}-${nonce}`}
                ref={frameRef}
                src={src}
                title={title}
                onLoad={() => setState("ready")}
                className={cn("size-full border-0", state === "loading" && "invisible")}
                allow="fullscreen; clipboard-write"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
