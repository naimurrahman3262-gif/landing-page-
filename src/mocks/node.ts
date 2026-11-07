import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Intercepts BFF → backend requests on the server (route handlers, RSC). */
export const server = setupServer(...handlers);
