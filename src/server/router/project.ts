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

      // Assuming the project creation is successful
      const project = await prisma.project.create({
        data: {
          title,
          description,
          userId,
          // initially without stages if not immediately required
          allStageIds: ""
        }
      });

      // Now create stages with the correct projectId
      const stagesData = new Array(5).fill({}).map((_, index) => ({
        projectId: project.id,  // We now have a valid projectId after project creation
        status: 0,              // Explicitly setting default values if necessary
        pos: index              // 'pos' field increments from 0 to 4
      }));

      console.log(stagesData);
      for (let i = 0; i < 5; i++) {
        await prisma.stage.create({
          data: {
            projectId: project.id,
            status: 0,
            pos: i
          }
        });
      }
      // Fetch all stage IDs for storing in allStageIds
      const stages = await prisma.stage.findMany({
        where: { projectId: project.id },
        select: { id: true }
      });
      const allStageIds = JSON.stringify(stages.map(stage => stage.id));
      console.log(allStageIds);

      // Update the project with all stage IDs
      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: { allStageIds: allStageIds },
      });
      console.log(updatedProject);
      return updatedProject;
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
          allStageIds: true,
        },
        take: 30,
      });
      if (projects == null || projects.length == 0) return [];
      const projectLst: Project[] = projects.map((project) => ({
        title: project.title,
        description: project.description,
        projectId: project.id,
        allStageIds: project.allStageIds,
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
  });
