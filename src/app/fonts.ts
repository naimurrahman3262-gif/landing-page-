import localFont from "next/font/local";
import { Inter } from "next/font/google";

/** Satoshi — display font: headings, money figures, buttons, nav, tabs, badges. */
export const satoshi = localFont({
  src: [
    { path: "../fonts/satoshi/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/satoshi/Satoshi-Bold.woff2", weight: "700", style: "normal" },
    // 900 is loaded but not preloaded; drop it in Phase 2 if the refs never use it.
    { path: "../fonts/satoshi/Satoshi-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

/** Inter — body font: paragraphs, inputs, labels, table cells, legal text. */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
