import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

type Props = { searchParams: Promise<{ ref?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { ref } = await searchParams;
  // Vercel geolocation; editable in the form.
  const country = (await headers()).get("x-vercel-ip-country")?.toUpperCase() ?? undefined;
  const referral = ref && /^[A-Za-z0-9-]{1,32}$/.test(ref) ? ref : undefined;
  return (
    <AuthCard className="max-w-120">
      <RegisterForm detectedCountry={country} referral={referral} />
    </AuthCard>
  );
}
