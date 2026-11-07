"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { Deal, PendingOrder, Position, StepUpResult, StepUpStart, TradingSummary } from "@/lib/api/schemas";

/** Date range: a preset or an inclusive custom range (YYYY-MM-DD). */
export type Range = { preset: "7d" | "30d" | "90d" } | { from: string; to: string };

export function rangeQuery(range: Range): string {
  return "preset" in range ? `range=${range.preset}` : `from=${range.from}&to=${range.to}`;
}

export function useTradingSummary(login: number | undefined, range: Range) {
  return useQuery({
    queryKey: ["trading", login, "summary", range],
    queryFn: async () =>
      TradingSummary.parse(await apiFetch(`/accounts/${login}/summary?${rangeQuery(range)}`)),
    enabled: !!login,
    refetchInterval: 30_000,
  });
}

export function useOpenPositions(login: number | undefined) {
  return useQuery({
    queryKey: ["trading", login, "positions"],
    queryFn: async () =>
      z.object({ items: z.array(Position) }).parse(await apiFetch(`/accounts/${login}/positions`)).items,
    enabled: !!login,
    refetchInterval: 30_000,
  });
}

export function usePendingOrders(login: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["trading", login, "orders"],
    queryFn: async () =>
      z.object({ items: z.array(PendingOrder) }).parse(await apiFetch(`/accounts/${login}/orders`)).items,
    enabled: !!login && enabled,
  });
}

export function useClosedDeals(login: number | undefined, range: Range, enabled = true) {
  return useQuery({
    queryKey: ["trading", login, "deals", range],
    queryFn: async () =>
      z
        .object({ items: z.array(Deal) })
        .parse(await apiFetch(`/accounts/${login}/deals?${rangeQuery(range)}`)).items,
    enabled: !!login && enabled,
  });
}

/** Step-up verification (§9): start → code → short-lived token for one sensitive call. */
export function useStepUp() {
  const start = useMutation({
    mutationFn: async (method?: "totp" | "email") =>
      StepUpStart.parse(await apiFetch("/step-up/start", { body: method ? { method } : {} })),
  });
  const verify = useMutation({
    mutationFn: async (code: string) =>
      StepUpResult.parse(await apiFetch("/step-up/verify", { body: { code } })),
  });
  return { start, verify };
}
