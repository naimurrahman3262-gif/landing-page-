"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { Alert, Onboarding, PortfolioSummary, TransactionPage } from "@/lib/api/schemas";

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: async () => PortfolioSummary.parse(await apiFetch("/portfolio/summary")),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => z.object({ items: z.array(Alert) }).parse(await apiFetch("/alerts")).items,
  });
}

export function useOnboarding() {
  return useQuery({
    queryKey: ["onboarding"],
    queryFn: async () => Onboarding.parse(await apiFetch("/onboarding")).steps,
  });
}

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: ["transactions", "recent", limit],
    queryFn: async () => TransactionPage.parse(await apiFetch(`/transactions?pageSize=${limit}`)).items,
    staleTime: 30_000,
  });
}
