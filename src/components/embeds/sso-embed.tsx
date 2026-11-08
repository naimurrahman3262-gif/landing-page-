"use client";

import { useEmbedSession } from "@/lib/api/queries/insights";
import { useTheme } from "@/lib/use-theme";
import { EmbedFrame } from "./embed-frame";

/** An embed launched through the BFF's single-use SSO handoff URL (brief §6.6, §6.7). */
export function SsoEmbed({
  provider,
  title,
}: {
  provider: "autochartist" | "social" | "pamm";
  title: string;
}) {
  const theme = useTheme();
  const session = useEmbedSession(provider, theme);
  return (
    <EmbedFrame
      title={title}
      src={session.data?.url ?? null}
      error={session.isError}
      onReload={() => void session.refetch()}
    />
  );
}
