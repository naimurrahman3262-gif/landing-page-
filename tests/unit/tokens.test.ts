import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Parse the two theme blocks of tokens.css into maps of hex values. */
const css = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

function block(selectorStart: string): Record<string, string> {
  const start = css.indexOf(selectorStart);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[name!] = value!.trim();
  return out;
}

const dark = block(":root,");
const light = { ...dark, ...block('[data-theme="light"]') };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function hex(theme: Record<string, string>, name: string): string {
  const value = theme[name];
  expect(value, `--${name}`).toMatch(/^#[0-9a-f]{6}$/i);
  return value!;
}

const TEXT = [
  "text-1",
  "text-2",
  "text-3",
  "primary-text",
  "success-text",
  "warning-text",
  "danger-text",
  "info-text",
];
const SURFACES = ["bg", "surface-1", "surface-2"];
const UI = ["border-input", "chart-1", "chart-2", "chart-3"];

describe.each([
  ["dark", dark],
  ["light", light],
])("%s theme contrast (WCAG 2.1 AA)", (_name, theme) => {
  it.each(TEXT)("--%s has ≥ 4.5:1 on bg, surface-1 and surface-2", (token) => {
    for (const surface of SURFACES) {
      expect(
        contrast(hex(theme, token), hex(theme, surface)),
        `${token} on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(UI)("--%s has ≥ 3:1 on bg, surface-1 and surface-2", (token) => {
    for (const surface of SURFACES) {
      expect(
        contrast(hex(theme, token), hex(theme, surface)),
        `${token} on ${surface}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("dark text on the cyan button passes; white would not", () => {
    for (const fill of ["primary", "primary-hover", "primary-active"]) {
      expect(contrast(hex(theme, "on-primary"), hex(theme, fill))).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast("#ffffff", hex(theme, "primary"))).toBeLessThan(3);
  });

  it("text on the danger button passes", () => {
    expect(contrast(hex(theme, "on-danger"), hex(theme, "danger"))).toBeGreaterThanOrEqual(4.5);
  });
});

it("keeps the brand primary fixed at #00D9FF in both themes", () => {
  expect(dark.primary?.toLowerCase()).toBe("#00d9ff");
  expect(light.primary?.toLowerCase()).toBe("#00d9ff");
});

/** Brief §2.4: no raw hex or arbitrary Tailwind values in components. */
describe("component hygiene", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
    });
  }
  const sources = files(join(process.cwd(), "src/components"));

  it("components use tokens only (no raw hex, no arbitrary spacing/size values)", () => {
    for (const path of sources) {
      const src = readFileSync(path, "utf8");
      const rel = path.replace(process.cwd(), "");
      expect(src, rel).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src, rel).not.toMatch(
        /\b(?:p|m|px|py|pt|pb|pl|pr|mx|my|w|h|gap|text|rounded|top|left|right|bottom)-\[\d/,
      );
    }
  });
});
