import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TransactionsPrintView } from "@/components/funds/print-views";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("funds.tx");
  return { title: t("title") };
}

export default function TransactionsPrintPage() {
  return <TransactionsPrintView />;
}
