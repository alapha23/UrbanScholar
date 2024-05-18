import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createRouter } from "./context";
import { Project } from "@/utils/types";

export const projectRouter = createRouter()
  .middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next();
  })
  .mutation("create", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      const { title, description, userId } = JSON.parse(input.data);
      console.log("Creating project with data:", {
        title,
        description,
        userId,
      });

      const project = await prisma.project.create({
        data: {
          title: title,
          description: description,
          userId: userId,
          stage: 1,
        },
      });
      // TODO: add create chat, link with project stage 1
      return project.id;
    },
  })
  .mutation("current-stage", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      const { projectId } = JSON.parse(input.data);
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
        },
        select: {
          stage: true,
        },
      });
      if (project != null) {
        return project.stage;
      } else return null;
    },
  })
  .mutation("fetch-all", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      const { userId } = JSON.parse(input.data);
      console.log("fetch-all invoked");
      const projects = await prisma.project.findMany({
        where: {
          userId: userId,
        },
        select: {
          title: true,
          description: true,
          id: true,
        },
        take: 20,
      });
      if (projects == null || projects.length == 0) return [];
      const projectLst: Project[] = projects.map((project) => ({
        title: project.title,
        description: project.description,
        projectId: project.id,
      }));

      return projectLst;
    },
  })
  .mutation("delete", {
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
  .mutation("update", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      try {
        const { projectId, stage } = JSON.parse(input.data);
        const res = await prisma.project.update({
          where: {
            id: projectId,
          },
          data: {
            stage: stage,
          },
        });
        return true;
      } catch (error) {
        console.error("Error updating stage:", error);
        return {
          success: false,
          message: "Failed to update project stage.",
        };
      }
    },
  });
