import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("messages/en.json has no duplicate keys (a later object would silently replace a string)", () => {
  const dupes: string[] = [];
  // JSON.parse keeps the last duplicate silently, so scan the raw text per object.
  const raw = readFileSync(join(process.cwd(), "messages/en.json"), "utf8");
  const stack: Set<string>[] = [];
  const re = /"((?:[^"\\]|\\.)*)"\s*:|[{}]/g;
  for (const m of raw.matchAll(re)) {
    if (m[0] === "{") stack.push(new Set());
    else if (m[0] === "}") stack.pop();
    else {
      const set = stack.at(-1)!;
      if (set.has(m[1]!)) dupes.push(m[1]!);
      set.add(m[1]!);
    }
  }
  expect(dupes).toEqual([]);
});
