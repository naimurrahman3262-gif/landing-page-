"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import {
  Account,
  AccountList,
  AccountType,
  LeverageOptions,
  OpenAccountResult,
  type OpenAccountInput,
} from "@/lib/api/schemas";

export const accountKeys = {
  all: ["accounts"] as const,
  detail: (login: number) => ["accounts", login] as const,
  leverage: (login: number) => ["accounts", login, "leverage"] as const,
  types: ["account-types"] as const,
};

/** G20: one cached list (30 s stale time) feeds Home, Accounts, pickers and details. */
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: async () => AccountList.parse(await apiFetch("/accounts")),
    staleTime: 30_000,
  });
}

export function useAccount(login: number) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: accountKeys.detail(login),
    queryFn: async () =>
      z.object({ account: Account, syncedAt: z.string() }).parse(await apiFetch(`/accounts/${login}`)),
    // Seed from the list so details open instantly when coming from a card.
    initialData: () => {
      const list = qc.getQueryData<AccountList>(accountKeys.all);
      const account = list?.items.find((a) => a.login === login);
      return account && list ? { account, syncedAt: list.syncedAt } : undefined;
    },
    initialDataUpdatedAt: () => qc.getQueryState(accountKeys.all)?.dataUpdatedAt,
    staleTime: 30_000,
  });
}

export function useAccountTypes() {
  return useQuery({
    queryKey: accountKeys.types,
    queryFn: async () =>
      z.object({ items: z.array(AccountType) }).parse(await apiFetch("/account-types")).items,
    staleTime: 5 * 60_000,
  });
}

export function useLeverageOptions(login: number, enabled: boolean) {
  return useQuery({
    queryKey: accountKeys.leverage(login),
    queryFn: async () => LeverageOptions.parse(await apiFetch(`/accounts/${login}/leverage`)),
    enabled,
    staleTime: 0,
  });
}

/** Write one account back into every cache that holds it. */
function useApplyAccount() {
  const qc = useQueryClient();
  return (account: Account) => {
    qc.setQueryData<AccountList>(accountKeys.all, (old) =>
      old ? { ...old, items: old.items.map((a) => (a.login === account.login ? account : a)) } : old,
    );
    qc.setQueryData(accountKeys.detail(account.login), (old: { syncedAt: string } | undefined) =>
      old ? { ...old, account } : old,
    );
  };
}

const AccountResult = z.object({ account: Account });

export function useRenameAccount(login: number) {
  const apply = useApplyAccount();
  return useMutation({
    mutationFn: async (label: string) =>
      AccountResult.parse(await apiFetch(`/accounts/${login}`, { method: "PATCH", body: { label } })).account,
    onSuccess: apply,
  });
}

export function useChangeLeverage(login: number) {
  const apply = useApplyAccount();
  return useMutation({
    mutationFn: async ({ leverage, stepUpToken }: { leverage: number; stepUpToken: string }) =>
      AccountResult.parse(
        await apiFetch(`/accounts/${login}/leverage`, {
          body: { leverage, acceptTerms: true },
          headers: { "x-step-up": stepUpToken },
        }),
      ).account,
    onSuccess: apply,
  });
}

export function useChangeMt5Password(login: number) {
  return useMutation({
    mutationFn: async (input: { type: "master" | "investor"; password: string; stepUpToken: string }) =>
      apiFetch(`/accounts/${login}/password`, {
        body: { type: input.type, password: input.password },
        headers: { "x-step-up": input.stepUpToken },
      }),
  });
}

export function useArchiveAccount(login: number) {
  const apply = useApplyAccount();
  return useMutation({
    mutationFn: async () =>
      AccountResult.parse(await apiFetch(`/accounts/${login}/archive`, { method: "POST" })).account,
    onSuccess: apply,
  });
}

export function useOpenAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OpenAccountInput) =>
      OpenAccountResult.parse(
        await apiFetch("/accounts", { body: input, idempotencyKey: crypto.randomUUID() }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
