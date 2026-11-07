import { accountHandlers } from "./account";
import { authHandlers } from "./auth";
import { fundsHandlers } from "./funds";
import { portfolioHandlers } from "./portfolio";
import { systemHandlers } from "./system";
import { tradingHandlers } from "./trading";
import { userHandlers } from "./user";

/** One handler module per domain; more are added each phase. */
export const handlers = [
  ...systemHandlers,
  ...authHandlers,
  ...userHandlers,
  ...tradingHandlers,
  ...portfolioHandlers,
  ...fundsHandlers,
  ...accountHandlers,
];
