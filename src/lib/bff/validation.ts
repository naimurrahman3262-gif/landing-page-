import type { ZodType } from "zod";
import {
  AddPayoutInput,
  ChatMessageInput,
  FavouriteInput,
  WatchlistInput,
  ChangePasswordInput,
  KycUploadInput,
  NewTicketInput,
  Preferences,
  ProfileInput,
  TicketReplyInput,
  DepositInput,
  TransferInput,
  WithdrawInput,
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
  { method: "POST", path: /^chat\/messages$/, schema: ChatMessageInput },
  { method: "PUT", path: /^insights\/watchlist$/, schema: WatchlistInput },
  { method: "PUT", path: /^insights\/signals\/[\w-]+\/favourite$/, schema: FavouriteInput },
  { method: "POST", path: /^accounts$/, schema: OpenAccountInput },
  { method: "PATCH", path: /^accounts\/\d+$/, schema: RenameAccountInput },
  { method: "POST", path: /^accounts\/\d+\/leverage$/, schema: ChangeLeverageInput },
  { method: "POST", path: /^accounts\/\d+\/password$/, schema: ChangeMt5PasswordInput },
  { method: "POST", path: /^deposits$/, schema: DepositInput },
  { method: "POST", path: /^withdrawals$/, schema: WithdrawInput },
  { method: "POST", path: /^transfers$/, schema: TransferInput },
  { method: "POST", path: /^payout-methods$/, schema: AddPayoutInput },
  { method: "PATCH", path: /^profile$/, schema: ProfileInput },
  { method: "POST", path: /^kyc\/documents$/, schema: KycUploadInput },
  { method: "POST", path: /^security\/password$/, schema: ChangePasswordInput },
  { method: "PATCH", path: /^preferences$/, schema: Preferences },
  { method: "POST", path: /^tickets$/, schema: NewTicketInput },
  { method: "POST", path: /^tickets\/[\w-]+\/messages$/, schema: TicketReplyInput },
];

export function schemaFor(method: string, path: string): ZodType | undefined {
  return MUTATION_SCHEMAS.find((m) => m.method === method && m.path.test(path))?.schema;
}
