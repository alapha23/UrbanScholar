import superjson from "superjson";

import { commentRouter } from "./comment";
import { createRouter } from "./context";
import { followRouter } from "./follow";
import { likeRouter } from "./like";
import { videoRouter } from "./video";
import { chatRouter } from "./chat";
import { registerRouter } from "./register";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("video.", videoRouter)
  .merge("like.", likeRouter)
  .merge("follow.", followRouter)
  .merge("comment.", commentRouter)
  .merge("register.", registerRouter)
  .merge("chat.", chatRouter);

export type AppRouter = typeof appRouter;
