"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import {
  FundsResult,
  MethodList,
  PayoutMethod,
  Quote,
  TransactionDetail,
  TransactionPage,
  TransactionSummary,
  Wallet,
  type AddPayoutInput,
  type Destination,
} from "@/lib/api/schemas";
import { accountKeys } from "./accounts";

export const fundsKeys = {
  wallet: ["wallet"] as const,
  methods: (purpose: string, all: boolean) => ["methods", purpose, all] as const,
  payouts: ["payout-methods"] as const,
  tx: (id: string) => ["transaction", id] as const,
};

export function useWallet() {
  return useQuery({
    queryKey: fundsKeys.wallet,
    queryFn: async () => Wallet.parse(await apiFetch("/wallet")),
    staleTime: 30_000,
  });
}

export function useMethods(purpose: "deposit" | "withdraw", all = false) {
  return useQuery({
    queryKey: fundsKeys.methods(purpose, all),
    queryFn: async () =>
      MethodList.parse(await apiFetch(`/methods?purpose=${purpose}${all ? "&all=1" : ""}`)),
    staleTime: 5 * 60_000,
  });
}

/** Server quote: the review step shows the backend's numbers, not the client's estimate. */
export function useQuote(
  input: { methodId?: string; amount?: number; purpose: "deposit" | "withdraw" },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["quote", input],
    queryFn: async () => Quote.parse(await apiFetch("/quotes", { body: input })),
    enabled: enabled && !!input.methodId && !!input.amount,
    retry: false,
    staleTime: 60_000,
  });
}

export function usePayoutMethods() {
  return useQuery({
    queryKey: fundsKeys.payouts,
    queryFn: async () =>
      z.object({ items: z.array(PayoutMethod) }).parse(await apiFetch("/payout-methods")).items,
  });
}

export function useAddPayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, stepUpToken }: { input: AddPayoutInput; stepUpToken: string }) =>
      z
        .object({ payoutMethod: PayoutMethod })
        .parse(await apiFetch("/payout-methods", { body: input, headers: { "x-step-up": stepUpToken } }))
        .payoutMethod,
    onSuccess: () => qc.invalidateQueries({ queryKey: fundsKeys.payouts }),
  });
}

/** After any money movement, balances everywhere must refresh. */
function useInvalidateBalances() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: accountKeys.all }),
      qc.invalidateQueries({ queryKey: fundsKeys.wallet }),
      qc.invalidateQueries({ queryKey: ["portfolio"] }),
      qc.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
}

/** Money-moving POSTs carry an idempotency key, generated once per review screen (§9). */
export function useCreateDeposit() {
  const invalidate = useInvalidateBalances();
  return useMutation({
    mutationFn: async (v: {
      methodId: string;
      destination: Destination;
      amount: number;
      idempotencyKey: string;
    }) =>
      FundsResult.parse(
        await apiFetch("/deposits", {
          body: { methodId: v.methodId, destination: v.destination, amount: v.amount },
          idempotencyKey: v.idempotencyKey,
        }),
      ),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateWithdrawal() {
  const invalidate = useInvalidateBalances();
  return useMutation({
    mutationFn: async (v: {
      source: Destination;
      payoutMethodId: string;
      amount: number;
      stepUpToken: string;
      idempotencyKey: string;
    }) =>
      FundsResult.parse(
        await apiFetch("/withdrawals", {
          body: { source: v.source, payoutMethodId: v.payoutMethodId, amount: v.amount },
          idempotencyKey: v.idempotencyKey,
          headers: { "x-step-up": v.stepUpToken },
        }),
      ),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateTransfer() {
  const invalidate = useInvalidateBalances();
  return useMutation({
    mutationFn: async (v: { from: Destination; to: Destination; amount: number; idempotencyKey: string }) =>
      FundsResult.parse(
        await apiFetch("/transfers", {
          body: { from: v.from, to: v.to, amount: v.amount },
          idempotencyKey: v.idempotencyKey,
        }),
      ),
    onSuccess: () => invalidate(),
  });
}

export function useDuplicateWithdrawal(source: Destination | null, amount: number | null) {
  return useQuery({
    queryKey: ["withdraw-duplicate", source, amount],
    queryFn: async () =>
      z
        .object({
          duplicate: z.object({ id: z.string(), createdAt: z.string(), status: z.string() }).nullable(),
        })
        .parse(await apiFetch(`/withdrawals/duplicate?source=${source}&amount=${amount}`)).duplicate,
    enabled: !!source && !!amount && amount > 0,
    staleTime: 10_000,
  });
}

/** Status pages poll until the transaction reaches a final state. */
export function useTransaction(id: string | undefined, poll = false) {
  return useQuery({
    queryKey: fundsKeys.tx(id ?? ""),
    queryFn: async () => TransactionDetail.parse(await apiFetch(`/transactions/${id}`)),
    enabled: !!id,
    refetchInterval: (q) =>
      poll && q.state.data && ["pending", "processing"].includes(q.state.data.status) ? 3_000 : false,
  });
}

export interface TransactionFilters {
  from: string | null;
  to: string | null;
  type: string[];
  status: string[];
  account: string | null;
  q: string;
  page: number;
  pageSize: number;
}

export function filtersQuery(f: Partial<TransactionFilters>): string {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.type?.length) p.set("type", f.type.join(","));
  if (f.status?.length) p.set("status", f.status.join(","));
  if (f.account) p.set("account", f.account);
  if (f.q) p.set("q", f.q);
  if (f.page) p.set("page", String(f.page));
  if (f.pageSize) p.set("pageSize", String(f.pageSize));
  return p.toString();
}

export function useTransactions(f: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", "list", f],
    queryFn: async () => TransactionPage.parse(await apiFetch(`/transactions?${filtersQuery(f)}`)),
    placeholderData: keepPreviousData,
  });
}

export function useTransactionSummary(f: Omit<TransactionFilters, "page" | "pageSize">) {
  return useQuery({
    queryKey: ["transactions", "summary", f],
    queryFn: async () => TransactionSummary.parse(await apiFetch(`/transactions/summary?${filtersQuery(f)}`)),
    placeholderData: keepPreviousData,
  });
}
