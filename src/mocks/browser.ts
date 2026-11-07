import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/** Browser worker — used for client-only work such as /dev/components and component tests. */
export const worker = setupWorker(...handlers);
