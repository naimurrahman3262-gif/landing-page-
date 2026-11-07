import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { DemoPersonas } from "@/components/auth/demo-personas";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

type Props = { searchParams: Promise<{ next?: string; expired?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations("auth.login");
  const sp = await searchParams;
  const notice = sp.expired ? t("expired") : sp.error === "oauth" ? t("oauthError") : undefined;
  return (
    <div className="grid w-full max-w-110 gap-4">
      <AuthCard>
        <LoginForm next={safeNext(sp.next)} notice={notice} />
      </AuthCard>
      <DemoPersonas />
    </div>
  );
}
