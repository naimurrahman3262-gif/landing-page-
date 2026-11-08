import { FUNNEL_STAGES, type ReferralProgram } from "@/lib/api/schemas";

/**
 * The referral funnel must never grow from one stage to the next (§6.8).
 * Returns the stages whose count is larger than the stage before them.
 */
export function funnelViolations(funnel: ReferralProgram["funnel"]): string[] {
  const out: string[] = [];
  for (let i = 1; i < FUNNEL_STAGES.length; i++) {
    const prev = FUNNEL_STAGES[i - 1]!;
    const cur = FUNNEL_STAGES[i]!;
    if (funnel[cur] > funnel[prev]) out.push(`${cur} (${funnel[cur]}) > ${prev} (${funnel[prev]})`);
  }
  return out;
}

/** Share URLs for the referral link. */
export function shareLinks(link: string, text: string) {
  const u = encodeURIComponent(link);
  const t = encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    x: `https://x.com/intent/post?text=${t}&url=${u}`,
    email: `mailto:?subject=${t}&body=${encodeURIComponent(`${text}\n\n${link}`)}`,
  };
}
