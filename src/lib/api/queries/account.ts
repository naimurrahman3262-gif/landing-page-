"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import {
  Article,
  ChatMessage,
  Kyc,
  KycDocument,
  PayoutMethod,
  Preferences,
  Profile,
  SecurityOverview,
  Ticket,
  type KycDocType,
  type NewTicketInput,
  type ProfileInput,
} from "@/lib/api/schemas";
import { fundsKeys } from "./funds";

/* -------------------------------- profile ------------------------------- */

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: async () => Profile.parse(await apiFetch("/profile")) });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: ProfileInput) =>
      Profile.parse(await apiFetch("/profile", { method: "PATCH", body: input })),
    onSuccess: (p) => {
      qc.setQueryData(["profile"], p);
      void qc.invalidateQueries({ queryKey: ["onboarding"] });
      router.refresh(); // name shown in the shell comes from the server
    },
  });
}

/* ---------------------------------- KYC --------------------------------- */

export function useKyc() {
  return useQuery({ queryKey: ["kyc"], queryFn: async () => Kyc.parse(await apiFetch("/kyc")) });
}

export function useUploadKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { type: KycDocType; file: File }) =>
      z.object({ document: KycDocument, status: z.string() }).parse(
        await apiFetch("/kyc/documents", {
          body: { type: v.type, fileName: v.file.name, mimeType: v.file.type, size: v.file.size },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["kyc"] });
      void qc.invalidateQueries({ queryKey: ["alerts"] });
      void qc.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}

/* ------------------------------- security ------------------------------- */

const securityKey = ["security"] as const;

export function useSecurity() {
  return useQuery({
    queryKey: securityKey,
    queryFn: async () => SecurityOverview.parse(await apiFetch("/security")),
  });
}

function useRefreshSecurity() {
  const qc = useQueryClient();
  const router = useRouter();
  return () => {
    void qc.invalidateQueries({ queryKey: securityKey });
    router.refresh();
  };
}

export function useTwoFactorSetup() {
  return useMutation({
    mutationFn: async () =>
      z
        .object({ secret: z.string(), otpauthUrl: z.string() })
        .parse(await apiFetch("/security/2fa/setup", { method: "POST" })),
  });
}

export function useEnableTwoFactor() {
  const refresh = useRefreshSecurity();
  return useMutation({
    mutationFn: async (code: string) =>
      z
        .object({ backupCodes: z.array(z.string()) })
        .parse(await apiFetch("/security/2fa/enable", { body: { code } })),
    onSuccess: refresh,
  });
}

export function useDisableTwoFactor() {
  const refresh = useRefreshSecurity();
  return useMutation({
    mutationFn: async (stepUpToken: string) =>
      apiFetch("/security/2fa/disable", { method: "POST", headers: { "x-step-up": stepUpToken } }),
    onSuccess: refresh,
  });
}

export function useChangePassword() {
  const refresh = useRefreshSecurity();
  return useMutation({
    mutationFn: async (v: { current: string; password: string; confirm: string }) =>
      apiFetch("/security/password", { body: v }),
    onSuccess: refresh,
  });
}

export function useChangeEmail() {
  return useMutation({
    mutationFn: async (v: { email: string; stepUpToken: string }) =>
      z
        .object({ pendingEmail: z.string(), sentTo: z.string() })
        .parse(
          await apiFetch("/security/email", {
            body: { email: v.email },
            headers: { "x-step-up": v.stepUpToken },
          }),
        ),
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | "others") =>
      id === "others"
        ? apiFetch("/security/sessions/revoke-others", { method: "POST" })
        : apiFetch(`/security/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: securityKey }),
  });
}

/* ------------------------------ preferences ------------------------------ */

export function usePreferences() {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: async () => Preferences.parse(await apiFetch("/preferences")),
  });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (p: Preferences) =>
      Preferences.parse(await apiFetch("/preferences", { method: "PATCH", body: p })),
    onSuccess: (p) => {
      qc.setQueryData(["preferences"], p);
      router.refresh(); // time zone and language come from the server layout
    },
  });
}

/* --------------------------- payout methods edit --------------------------- */

export function useUpdatePayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; label?: string; isDefault?: boolean }) =>
      z
        .object({ payoutMethod: PayoutMethod })
        .parse(
          await apiFetch(`/payout-methods/${v.id}`, {
            method: "PATCH",
            body: { label: v.label, isDefault: v.isDefault },
          }),
        ),
    onSuccess: () => qc.invalidateQueries({ queryKey: fundsKeys.payouts }),
  });
}

export function useRemovePayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; stepUpToken: string }) =>
      apiFetch(`/payout-methods/${v.id}`, { method: "DELETE", headers: { "x-step-up": v.stepUpToken } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: fundsKeys.payouts }),
  });
}

/* ---------------------------------- help --------------------------------- */

export function useArticles(q = "", category?: string) {
  return useQuery({
    queryKey: ["articles", q, category],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (category) p.set("category", category);
      return z.object({ items: z.array(Article) }).parse(await apiFetch(`/help/articles?${p}`)).items;
    },
    staleTime: 5 * 60_000,
  });
}

export function useArticle(slug: string) {
  return useQuery({
    queryKey: ["article", slug],
    queryFn: async () => Article.parse(await apiFetch(`/help/articles/${slug}`)),
  });
}

export function useTickets(status: string, q: string) {
  return useQuery({
    queryKey: ["tickets", status, q],
    queryFn: async () =>
      z
        .object({ items: z.array(Ticket) })
        .parse(await apiFetch(`/tickets?status=${status}&q=${encodeURIComponent(q)}`)).items,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => Ticket.parse(await apiFetch(`/tickets/${id}`)),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTicketInput) => Ticket.parse(await apiFetch("/tickets", { body: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useReplyTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { body: string; attachments: { name: string; size: number }[] }) =>
      Ticket.parse(await apiFetch(`/tickets/${id}/messages`, { body: v })),
    onSuccess: (t) => {
      qc.setQueryData(["ticket", id], t);
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useCloseTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => Ticket.parse(await apiFetch(`/tickets/${id}/close`, { method: "POST" })),
    onSuccess: (t) => {
      qc.setQueryData(["ticket", id], t);
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

/* ---------------------------------- chat --------------------------------- */

export function useSendChat() {
  return useMutation({
    mutationFn: async (v: { body: string; page: string }) =>
      z
        .object({ reply: ChatMessage })
        .parse(await apiFetch("/chat/messages", { body: { body: v.body, context: { page: v.page } } })).reply,
  });
}
