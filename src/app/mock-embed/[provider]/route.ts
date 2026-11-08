import { notFound } from "next/navigation";

/**
 * Stand-in for third-party embeds in mock builds only (the BFF's SSO handoff
 * points here). Production builds return 404. `hang` never finishes loading,
 * to exercise EmbedFrame's timeout.
 */
const NAMES: Record<string, string> = {
  autochartist: "Autochartist",
  social: "Social trading",
  pamm: "PAMM",
};

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") notFound();
  const { provider } = await params;
  if (provider === "hang") {
    await new Promise((r) => setTimeout(r, 45_000));
    return new Response("timed out", { status: 504 });
  }
  const name = NAMES[provider];
  if (!name) notFound();
  const dark = new URL(req.url).searchParams.get("theme") !== "light";
  const [bg, fg, muted] = dark ? ["#0e1012", "#e8eaed", "#9aa0a6"] : ["#ffffff", "#15171a", "#5f6368"];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} (mock)</title>
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;background:${bg};color:${fg}}main{padding:24px;max-width:720px}p{color:${muted}}</style></head>
<body><main><h1>${name}</h1><p>Mock provider page. In production the provider's own app loads here after the SSO handoff.</p></main>
<script>parent.postMessage({type:"wpx:embed-height",height:Math.max(640,document.documentElement.scrollHeight)},location.origin)</script>
</body></html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
