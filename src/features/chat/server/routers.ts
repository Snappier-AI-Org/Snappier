import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const chatRouter = createTRPCRouter({
  // Get all chat messages for a workflow
  getMessages: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // First verify the user owns this workflow
      const workflow = await prisma.workflow.findFirst({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      if (!workflow) {
        return [];
      }

      const messages = await prisma.chatMessage.findMany({
        where: {
          workflowId: input.workflowId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return messages;
    }),

  // Save a new message
  saveMessage: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        id: z.string(), // The message ID from the AI SDK
        role: z.string(),
        content: z.string(),
        parts: z.any().optional(), // The full parts array from AI SDK
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First verify the user owns this workflow
      const workflow = await prisma.workflow.findFirst({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      if (!workflow) {
        throw new Error("Workflow not found or access denied");
      }

      // Check if message already exists (avoid duplicates)
      const existing = await prisma.chatMessage.findFirst({
        where: {
          id: input.id,
          workflowId: input.workflowId,
        },
      });

      if (existing) {
        // Update the existing message (in case content changed during streaming)
        return prisma.chatMessage.update({
          where: { id: input.id },
          data: {
            content: input.content,
            parts: input.parts || null,
          },
        });
      }

      // Create new message
      return prisma.chatMessage.create({
        data: {
          id: input.id,
          workflowId: input.workflowId,
          role: input.role,
          content: input.content,
          parts: input.parts || null,
        },
      });
    }),

  // Save multiple messages at once (for batch saving)
  saveMessages: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        messages: z.array(
          z.object({
            id: z.string(),
            role: z.string(),
            content: z.string(),
            parts: z.any().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First verify the user owns this workflow
      const workflow = await prisma.workflow.findFirst({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      if (!workflow) {
        throw new Error("Workflow not found or access denied");
      }

      // Get existing message IDs
      const existingMessages = await prisma.chatMessage.findMany({
        where: {
          workflowId: input.workflowId,
        },
        select: { id: true },
      });
      const existingIds = new Set(existingMessages.map((m) => m.id));

      // Filter out messages that already exist
      const newMessages = input.messages.filter((m) => !existingIds.has(m.id));

      if (newMessages.length === 0) {
        return { created: 0 };
      }

      // Create new messages
      await prisma.chatMessage.createMany({
        data: newMessages.map((m) => ({
          id: m.id,
          workflowId: input.workflowId,
          role: m.role,
          content: m.content,
          parts: m.parts || null,
        })),
        skipDuplicates: true,
      });

      return { created: newMessages.length };
    }),

  // Clear all messages for a workflow
  clearMessages: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First verify the user owns this workflow
      const workflow = await prisma.workflow.findFirst({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      if (!workflow) {
        throw new Error("Workflow not found or access denied");
      }

      await prisma.chatMessage.deleteMany({
        where: {
          workflowId: input.workflowId,
        },
      });

      return { success: true };
    }),
});

