import superjson from "superjson";

import { chatRouter } from "./chat";
import { createRouter } from "./context";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("chat.", chatRouter);

export type AppRouter = typeof appRouter;
