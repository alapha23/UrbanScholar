import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createRouter } from "./context";

export const chatRouter = createRouter()
  .query("send", {
    input: z.object({
      message: z.string(),
    }),
    resolve: async ({ ctx: { session }, input }) => {
      return true;
    },
  })
  .middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next();
  })
  .mutation("change-status", {
    input: z.object({
    }),
    resolve: async ({ ctx: { session }, input }) => {
      return true;
    },
  });
