import { systemHandlers } from "./system";

/** One handler module per domain (accounts, transactions, …) is added per phase. */
export const handlers = [...systemHandlers];
