import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StyleGuide } from "./style-guide";

export const metadata: Metadata = { title: "Components" };

/** Living style guide (brief §7). Development only; 404 in production builds. */
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_STYLEGUIDE !== "enabled") notFound();
  return <StyleGuide />;
}
