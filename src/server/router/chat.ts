import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createRouter } from "./context";

export const chatRouter = createRouter()
  .middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next();
  })
  .mutation("create", {
    input: z.object({
      userId: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      // Create a new chat entry
      const chat = await prisma.chat.create({
        data: {
          userId: input.userId,
          title: "New Chat",
          content: "",
        },
        select: {
          id: true,
          title: true,
          content: true,
        },
      });
      return chat.id;
    },
  });
