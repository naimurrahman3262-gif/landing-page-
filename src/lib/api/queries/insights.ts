"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { EmbedSession, MarketQuote, ReferralProgram, Sentiment, Signal } from "@/lib/api/schemas";
import { funnelViolations } from "@/lib/referrals";

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () =>
      z.object({ items: z.array(MarketQuote) }).parse(await apiFetch("/market/quotes")).items,
    refetchInterval: 30_000,
  });
}

export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: async () =>
      z.object({ symbols: z.array(z.string()) }).parse(await apiFetch("/insights/watchlist")).symbols,
  });
}

export function useSaveWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (symbols: string[]) =>
      z
        .object({ symbols: z.array(z.string()) })
        .parse(await apiFetch("/insights/watchlist", { method: "PUT", body: { symbols } })).symbols,
    onSuccess: (s) => qc.setQueryData(["watchlist"], s),
  });
}

export function useSentiment(symbols: string[]) {
  return useQuery({
    queryKey: ["sentiment", symbols],
    queryFn: async () => Sentiment.parse(await apiFetch(`/insights/sentiment?symbols=${symbols.join(",")}`)),
    enabled: symbols.length > 0,
  });
}

export function useSignals() {
  return useQuery({
    queryKey: ["signals"],
    queryFn: async () =>
      z.object({ items: z.array(Signal), syncedAt: z.string() }).parse(await apiFetch("/insights/signals")),
    refetchInterval: 60_000,
  });
}

export function useToggleFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; favourite: boolean }) =>
      Signal.parse(
        await apiFetch(`/insights/signals/${v.id}/favourite`, {
          method: "PUT",
          body: { favourite: v.favourite },
        }),
      ),
    onMutate: (v) => {
      qc.setQueryData<{ items: Signal[]; syncedAt: string }>(
        ["signals"],
        (d) =>
          d && { ...d, items: d.items.map((s) => (s.id === v.id ? { ...s, favourite: v.favourite } : s)) },
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });
}

/** SSO handoff URL for an embed; never cached (single-use tokens). */
export function useEmbedSession(provider: "autochartist" | "social" | "pamm", theme: string) {
  return useQuery({
    queryKey: ["embed", provider, theme],
    queryFn: async () => EmbedSession.parse(await apiFetch(`/embeds/${provider}?theme=${theme}`)),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useReferralProgram() {
  return useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const p = ReferralProgram.parse(await apiFetch("/rewards/referrals"));
      const bad = funnelViolations(p.funnel);
      // Dev only: the funnel must never grow from one stage to the next (§6.8).
      if (bad.length && process.env.NODE_ENV !== "production")
        console.warn("[referrals] funnel not monotonic:", bad);
      return p;
    },
  });
}
