import { notFound } from "next/navigation";
import { ArticleView } from "@/components/help/article-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("article");

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  return <ArticleView slug={slug} />;
}
