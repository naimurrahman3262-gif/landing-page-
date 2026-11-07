import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailForm } from "@/components/auth/code-forms";
import { getCurrentUser } from "@/lib/bff/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verifyEmail");
  return { title: t("title") };
}

export default async function VerifyEmailPage() {
  const current = await getCurrentUser();
  const email = current && current !== "expired" ? current.user.email : null;
  return (
    <AuthCard>
      <VerifyEmailForm email={email} />
    </AuthCard>
  );
}
