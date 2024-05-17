import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createRouter } from "./context";

export const registerRouter = createRouter()
  .middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next();
  })
  .mutation("verify", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      const { role, invitationCode } = JSON.parse(input.data);
      let value = false;
      if (role === "planner") {
        if (invitationCode === "CELPLANNER") value = true;
      } else if (role === "policy_maker") {
        if (invitationCode === "CELPOLICYMAKER") value = true;
      }
      return value;
    },
  })
  .mutation("getRole", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      const { userId } = JSON.parse(input.data);
      const role = await prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          role: true,
        },
      });
      return role;
    },
  })
  .mutation("save_profile", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      try {
        // only citizens call this to save their profile
        const { userId, profile } = JSON.parse(input.data);
        const res = await prisma.profile.upsert({
          where: {
            userId: userId,
          },
          update: {
            firstName: profile.firstName,
            middleName: profile.middleName,
            lastName: profile.lastName,
            affiliation: profile.affiliation,
            age: profile.age,
            gender: profile.gender,
            profession: profile.profession,
          },
          create: {
            id: userId,
            userId: userId,
            firstName: profile.firstName,
            middleName: profile.middleName,
            lastName: profile.lastName,
            affiliation: profile.affiliation,
            age: profile.age,
            gender: profile.gender,
            profession: profile.profession,
          },
        });
        console.log(res);
        return true;
      } catch (error) {
        console.error("Error updating user role:", error);
        return {
          success: false,
          message: "Failed to update user role.",
        };
      }
    },
  })
  .mutation("save_role", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      try {
        // all three roles call this to save their role
        const { userId, role } = JSON.parse(input.data);
        const res = await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            role: role,
          },
        });
        console.log(res);
        return true;
      } catch (error) {
        console.error("Error updating user role:", error);
        return {
          success: false,
          message: "Failed to update user role.",
        };
      }
    },
  });
