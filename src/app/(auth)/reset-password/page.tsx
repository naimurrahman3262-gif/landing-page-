import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthCard, AuthHeading } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/code-forms";
import { buttonVariants } from "@/components/ui/button";
import { RESET_COOKIE } from "@/lib/auth/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.reset");
  const hasFlow = !!(await cookies()).get(RESET_COOKIE)?.value;
  return (
    <AuthCard>
      {hasFlow ? (
        <ResetPasswordForm />
      ) : (
        <>
          <AuthHeading title={t("heading")} subtitle={t("expired")} />
          <Link href="/forgot-password" className={buttonVariants({ block: true })}>
            {t("startAgain")}
          </Link>
        </>
      )}
    </AuthCard>
  );
}
