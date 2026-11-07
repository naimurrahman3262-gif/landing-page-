import { authHandlers } from "./auth";
import { systemHandlers } from "./system";
import { userHandlers } from "./user";

/** One handler module per domain; more are added each phase. */
export const handlers = [...systemHandlers, ...authHandlers, ...userHandlers];
