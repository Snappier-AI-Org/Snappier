import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import prisma from "@/lib/db";
import type { Node, Edge } from "@xyflow/react";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import { PAGINATION } from "@/config/constants";
import { NodeType } from "@/generated/prisma";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";

// Helper to convert Prisma objects to plain objects, avoiding circular references
function toPlainObject<T extends Record<string, any>>(obj: T): T {
  return Object.assign({}, obj);
}

export const workflowsRouter = createTRPCRouter({
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await sendWorkflowExecution({
        workflowId: input.id,
      });
      
      return toPlainObject(workflow);
    }),

  create: premiumProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
    const workflow = await prisma.workflow.create({
      data: {
        name: input.name,
        userId: ctx.auth.user.id,
        nodes: {
          create: {
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            name: NodeType.INITIAL,
          },
        }
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return workflow;
  }),
  remove: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // First, cancel any running schedule executors for this workflow
    const schedulesToCancel = await prisma.scheduledWorkflow.findMany({
      where: {
        workflowId: input.id,
        userId: ctx.auth.user.id,
      },
      select: { id: true },
    });

    // Send cancel events for all schedules before deleting
    for (const schedule of schedulesToCancel) {
      await inngest.send({
        name: "schedule/cancel",
        data: { scheduleId: schedule.id },
      });
    }

    const workflow = await prisma.workflow.delete({
      where: {
        id: input.id,
        userId: ctx.auth.user.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return workflow;
  }),
  update: protectedProcedure
    .input(
      z.object({ 
      id: z.string(), 
      nodes: z.array(
        z.object({
          id: z.string(),
          type: z.nativeEnum(NodeType).nullish(),
          position: z.object({ x: z.number(), y: z.number() }),
          data: z.record(z.string(), z.any()).optional(),
        }),
      ),
      edges: z.array(
        z.object({
          source: z.string(),
          target: z.string(),
          sourceHandle: z.string().nullish(),
          targetHandle: z.string().nullish(),
        }),
      )
  })
)
    .mutation(async({ ctx, input }) => {
      const { id, nodes, edges } = input;

      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id, userId: ctx.auth.user.id },
      });

      //Transaction to ensure consistency
      return await prisma.$transaction(async (tx) => {
        // Get existing node IDs only (we don't need connections for this check)
        const existingNodes = await tx.node.findMany({
          where: { workflowId: id },
          select: { id: true },
        });
        
        const nodeIds = new Set(nodes.map(n => n.id));
        
        // Delete nodes that no longer exist
        const nodesToDelete = existingNodes.filter(n => !nodeIds.has(n.id));
        if (nodesToDelete.length > 0) {
          const nodeIdsToDelete = nodesToDelete.map(n => n.id);
          
          // Find scheduled workflows associated with deleted schedule trigger nodes
          // so we can cancel their Inngest functions before deleting
          const schedulesToCancel = await tx.scheduledWorkflow.findMany({
            where: {
              workflowId: id,
              nodeId: { in: nodeIdsToDelete },
            },
            select: { id: true },
          });

          // Cancel any running Inngest schedule executors for these schedules
          // This prevents orphaned executions from continuing after node deletion
          for (const schedule of schedulesToCancel) {
            await inngest.send({
              name: "schedule/cancel",
              data: { scheduleId: schedule.id },
            });
          }

          // Delete the scheduled workflows from the database
          await tx.scheduledWorkflow.deleteMany({
            where: {
              workflowId: id,
              nodeId: { in: nodeIdsToDelete },
            },
          });
          
          await tx.node.deleteMany({
            where: {
              workflowId: id,
              id: { in: nodeIdsToDelete },
            },
          });
        }
        
        // Batch upsert nodes (update existing, create new)
        // Split into updates and creates for better performance
        const existingNodeIds = new Set(existingNodes.map(n => n.id));
        const nodesToCreate = nodes.filter(n => !existingNodeIds.has(n.id));
        const nodesToUpdate = nodes.filter(n => existingNodeIds.has(n.id));

        // Batch create new nodes
        if (nodesToCreate.length > 0) {
          // Validate that node.type is a valid NodeType enum value
          const validNodeTypes = new Set(Object.values(NodeType) as string[]);
          const validNodesToCreate = nodesToCreate.filter((node) => {
            if (!node.type) return false;
            // Convert to string and check if it's a valid enum value
            const typeStr = String(node.type);
            return validNodeTypes.has(typeStr);
          });
          
          if (validNodesToCreate.length > 0) {
            await tx.node.createMany({
              data: validNodesToCreate.map((node) => ({
                id: node.id,
                workflowId: id,
                name: String(node.type) || "unknown",
                type: String(node.type) as NodeType,
                position: node.position,
                data: node.data || {},
              })),
              skipDuplicates: true,
            });
          }
        }

        // Batch update existing nodes
        if (nodesToUpdate.length > 0) {
          const validNodeTypes = new Set(Object.values(NodeType) as string[]);
          const validNodesToUpdate = nodesToUpdate.filter((node) => {
            if (!node.type) return false;
            const typeStr = String(node.type);
            return validNodeTypes.has(typeStr);
          });
          
          if (validNodesToUpdate.length > 0) {
            await Promise.all(
              validNodesToUpdate.map((node) =>
                tx.node.update({
                  where: { id: node.id },
                  data: {
                    name: String(node.type) || "unknown",
                    type: String(node.type) as NodeType,
                    position: node.position,
                    data: node.data || {},
                  },
                })
              )
            );
          }
        }
        
        // Delete all existing connections and recreate (simpler than diffing)
        await tx.connection.deleteMany({
          where: { workflowId: id },
        });
        
        // Get all valid node IDs that now exist in the database for this workflow
        const validNodes = await tx.node.findMany({
          where: { workflowId: id },
          select: { id: true },
        });
        const validNodeIds = new Set(validNodes.map(n => n.id));
        
        // Filter edges to only include those where both source and target nodes exist
        const validEdges = edges.filter(
          (edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
        );
        
        // Create connections
        if (validEdges.length > 0) {
          await tx.connection.createMany({
            data: validEdges.map((edge) => ({
              workflowId: id,
              fromNodeId: edge.source,
              toNodeId: edge.target,
              fromOutput: edge.sourceHandle || "main",
              toInput: edge.targetHandle || "main",
            })),
          });
        }
        
        const updatedWorkflow = await tx.workflow.update({
          where: { id },
          data: { updatedAt: new Date() },
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
       });
       return updatedWorkflow;
      });
    }),
  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.update({
        where: { id: input.id, userId: ctx.auth.user.id },
        data: { name: input.name},
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return toPlainObject(workflow);
    }),
  getOne: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query( async({ ctx, input }) => {
          const workflow =await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.auth.user.id },
        include: { nodes: true, connections: true },
          });
          //This part transform server nodoes to react-flow compatible nodes
          const nodes: Node[] = workflow.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position as { x: number; y: number },
          data: (node.data as Record<string, unknown>) || {},
        }));
          // Transform server connections to react-flow compatible edges
          const edges: Edge[] = workflow.connections.map((connection) => ({
          id: connection.id,
          source: connection.fromNodeId,
          target: connection.toNodeId,
          sourceHandle: connection.fromOutput,
          targetHandle: connection.toInput,
        }));

        return {
          id: workflow.id,
          name: workflow.name,
          nodes,
          edges,
        };
      }),
  getMany: protectedProcedure
      .input(
        z.object({
           page: z.number().default(PAGINATION.DEFAULT_PAGE),
           pageSize: z
            .number()
            .min(PAGINATION.MIN_PAGE_SIZE)
            .max(PAGINATION.MAX_PAGE_SIZE)
            .default(PAGINATION.DEFAULT_PAGE_SIZE),
          search: z.string().default(""),
          })
        )
      .query( async ({ ctx, input }) => {
        const { page, pageSize, search } = input;

        const [items, totalCount] = await Promise.all([
          prisma.workflow.findMany({
            skip: (page - 1) * pageSize,
            take: pageSize,
            where: { 
              userId: ctx.auth.user.id, 
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
              // Don't fetch nodes/connections for list view
            },
            orderBy: {
              updatedAt: "desc",
            },
          }),
          prisma.workflow.count({
            where: { userId: ctx.auth.user.id,
              name: { 
                contains: search,
                mode: "insensitive",
              },
            },
          }),

        ]);

        // Convert Prisma objects to plain objects to avoid circular reference issues with superjson
        // Use Object.assign to create plain objects without prototype chains
        const plainItems = items.map((item) => toPlainObject({
          id: item.id,
          name: item.name,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));

        const totalPages = Math.ceil(totalCount / pageSize);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
          items: plainItems,
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        };
      }),
});



