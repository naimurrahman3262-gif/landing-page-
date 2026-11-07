import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReceiptView } from "@/components/funds/print-views";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("funds.receipt");
  return { title: t("title") };
}

type Props = { params: Promise<{ id: string }> };

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params;
  return <ReceiptView id={id} />;
}
