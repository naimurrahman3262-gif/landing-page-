import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { TwoFactorForm } from "@/components/auth/code-forms";
import { safeNext } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.twoFactor");
  return { title: t("title") };
}

type Props = { searchParams: Promise<{ next?: string }> };

export default async function TwoFactorPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <AuthCard>
      <TwoFactorForm next={safeNext(next)} />
    </AuthCard>
  );
}
