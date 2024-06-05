import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createRouter } from "./context";

export const stageRouter = createRouter()
    .middleware(async ({ ctx, next }) => {
        if (!ctx.session) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return next();
    })
    .mutation("update", {
        input: z.object({
            data: z.string(),
        }),
        resolve: async ({ ctx: { prisma }, input }) => {
            //const { title, description, userId } = JSON.parse(input.data);
            return true;
        }
    });
