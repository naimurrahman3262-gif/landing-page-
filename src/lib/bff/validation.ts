import type { ZodType } from "zod";
import {
  ChangeLeverageInput,
  ChangeMt5PasswordInput,
  OpenAccountInput,
  RenameAccountInput,
} from "@/lib/api/schemas";

/**
 * BFF-side validation for mutations that go through the generic proxy (§9:
 * validate on the client and in the BFF). First match wins.
 */
export const MUTATION_SCHEMAS: { method: string; path: RegExp; schema: ZodType }[] = [
  { method: "POST", path: /^accounts$/, schema: OpenAccountInput },
  { method: "PATCH", path: /^accounts\/\d+$/, schema: RenameAccountInput },
  { method: "POST", path: /^accounts\/\d+\/leverage$/, schema: ChangeLeverageInput },
  { method: "POST", path: /^accounts\/\d+\/password$/, schema: ChangeMt5PasswordInput },
];

export function schemaFor(method: string, path: string): ZodType | undefined {
  return MUTATION_SCHEMAS.find((m) => m.method === method && m.path.test(path))?.schema;
}
