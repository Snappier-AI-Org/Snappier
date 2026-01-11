import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure, premiumProcedure } from "@/trpc/init";
import { PAGINATION } from "@/config/constants";
import { TemplateVisibility, TemplateCategory, NodeType, Prisma } from "@/generated/prisma";
import { TRPCError } from "@trpc/server";

// Node schema for template content
const templateNodeSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(NodeType).nullish(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.any()).optional(),
});

const templateConnectionSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
});

export const templatesRouter = createTRPCRouter({
  // Create a new template (from scratch or from existing workflow)
  create: premiumProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(2000).optional(),
        category: z.nativeEnum(TemplateCategory).default("OTHER"),
        visibility: z.nativeEnum(TemplateVisibility).default("PRIVATE"),
        tags: z.array(z.string()).max(10).default([]),
        price: z.number().min(0).default(0), // Price in cents
        nodes: z.array(templateNodeSchema),
        connections: z.array(templateConnectionSchema),
        sourceWorkflowId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await prisma.template.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          visibility: input.visibility,
          tags: input.tags,
          price: input.visibility === "MARKETPLACE" ? input.price : 0,
          nodes: input.nodes,
          connections: input.connections,
          sourceWorkflowId: input.sourceWorkflowId,
          userId: ctx.auth.user.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          visibility: true,
          price: true,
          createdAt: true,
        },
      });

      return template;
    }),

  // Create template from existing workflow
  createFromWorkflow: premiumProcedure
    .input(
      z.object({
        workflowId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().max(2000).optional(),
        category: z.nativeEnum(TemplateCategory).default("OTHER"),
        visibility: z.nativeEnum(TemplateVisibility).default("PRIVATE"),
        tags: z.array(z.string()).max(10).default([]),
        price: z.number().min(0).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch the workflow with nodes and connections
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
        include: {
          nodes: true,
          connections: true,
        },
      });

      // Transform nodes and connections to template format
      const nodes = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      }));

      const connections = workflow.connections.map((conn) => ({
        id: conn.id,
        source: conn.fromNodeId,
        target: conn.toNodeId,
        sourceHandle: conn.fromOutput,
        targetHandle: conn.toInput,
      }));

      const template = await prisma.template.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          visibility: input.visibility,
          tags: input.tags,
          price: input.visibility === "MARKETPLACE" ? input.price : 0,
          nodes: nodes,
          connections: connections,
          sourceWorkflowId: input.workflowId,
          userId: ctx.auth.user.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          visibility: true,
          price: true,
          createdAt: true,
        },
      });

      return template;
    }),

  // Update a template
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(2000).optional(),
        category: z.nativeEnum(TemplateCategory).optional(),
        visibility: z.nativeEnum(TemplateVisibility).optional(),
        tags: z.array(z.string()).max(10).optional(),
        price: z.number().min(0).optional(),
        nodes: z.array(templateNodeSchema).optional(),
        connections: z.array(templateConnectionSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const existing = await prisma.template.findUnique({
        where: { id, userId: ctx.auth.user.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      const template = await prisma.template.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category && { category: data.category }),
          ...(data.visibility && { visibility: data.visibility }),
          ...(data.tags && { tags: data.tags }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.nodes && { nodes: data.nodes }),
          ...(data.connections && { connections: data.connections }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          visibility: true,
          price: true,
          updatedAt: true,
        },
      });

      return template;
    }),

  // Delete a template
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await prisma.template.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return template;
    }),

  // Get user's own templates
  getMyTemplates: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        category: z.nativeEnum(TemplateCategory).optional(),
        visibility: z.nativeEnum(TemplateVisibility).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, category, visibility } = input;

      const where = {
        userId: ctx.auth.user.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(category && { category }),
        ...(visibility && { visibility }),
      };

      const [items, totalCount] = await Promise.all([
        prisma.template.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            description: true,
            thumbnail: true,
            category: true,
            visibility: true,
            price: true,
            usageCount: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.template.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),

  // Get marketplace templates (public + marketplace visibility)
  getMarketplace: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        category: z.nativeEnum(TemplateCategory).optional(),
        priceFilter: z.enum(["all", "free", "paid"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, category, priceFilter } = input;

      const where = {
        visibility: { in: ["PUBLIC", "MARKETPLACE"] as TemplateVisibility[] },
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(category && { category }),
        ...(priceFilter === "free" && { price: 0 }),
        ...(priceFilter === "paid" && { price: { gt: 0 } }),
      };

      const [items, totalCount] = await Promise.all([
        prisma.template.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            description: true,
            thumbnail: true,
            category: true,
            visibility: true,
            price: true,
            currency: true,
            usageCount: true,
            tags: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
        }),
        prisma.template.count({ where }),
      ]);

      // Check which templates the user has already acquired
      const userPurchases = await prisma.templatePurchase.findMany({
        where: {
          userId: ctx.auth.user.id,
          templateId: { in: items.map((t) => t.id) },
        },
        select: { templateId: true },
      });
      const purchasedIds = new Set(userPurchases.map((p) => p.templateId));

      // Check which templates the user owns
      const ownedTemplates = items.filter((t) => t.user.id === ctx.auth.user.id);
      const ownedIds = new Set(ownedTemplates.map((t) => t.id));

      const itemsWithAccess = items.map((item) => ({
        ...item,
        hasAccess:
          item.price === 0 ||
          purchasedIds.has(item.id) ||
          ownedIds.has(item.id),
        isOwner: ownedIds.has(item.id),
      }));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items: itemsWithAccess,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),

  // Get a single template by ID
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await prisma.template.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          purchases: {
            where: { userId: ctx.auth.user.id },
            select: { id: true },
          },
        },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // Check access
      const isOwner = template.userId === ctx.auth.user.id;
      const hasPurchased = template.purchases.length > 0;
      const isFreeOrPublic =
        template.visibility === "PUBLIC" || template.price === 0;

      const hasAccess = isOwner || hasPurchased || isFreeOrPublic;

      // Don't return node/connection data if user doesn't have access
      if (!hasAccess && template.visibility === "MARKETPLACE") {
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          thumbnail: template.thumbnail,
          category: template.category,
          visibility: template.visibility,
          price: template.price,
          currency: template.currency,
          usageCount: template.usageCount,
          tags: template.tags,
          user: template.user,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          hasAccess: false,
          isOwner: false,
          nodes: null,
          connections: null,
        };
      }

      return {
        ...template,
        hasAccess,
        isOwner,
      };
    }),

  // "Purchase" or acquire a free template
  acquire: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        paymentId: z.string().optional(), // For paid templates
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await prisma.template.findUnique({
        where: { id: input.templateId },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // Check if already acquired
      const existing = await prisma.templatePurchase.findUnique({
        where: {
          userId_templateId: {
            userId: ctx.auth.user.id,
            templateId: input.templateId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have this template",
        });
      }

      // Can't buy your own template
      if (template.userId === ctx.auth.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot purchase your own template",
        });
      }

      // For paid templates, verify payment (in real app, verify with Stripe/Polar)
      if (template.price > 0 && !input.paymentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment required for this template",
        });
      }

      // Platform fee rate (10%)
      const PLATFORM_FEE_RATE = 0.10;

      const purchase = await prisma.templatePurchase.create({
        data: {
          userId: ctx.auth.user.id,
          templateId: input.templateId,
          pricePaid: template.price,
          currency: template.currency,
          paymentId: input.paymentId,
          paymentStatus: template.price > 0 ? "completed" : "completed",
        },
        select: {
          id: true,
          templateId: true,
          createdAt: true,
        },
      });

      // If it was a paid template, create earning for seller
      if (template.price > 0) {
        const platformFee = Math.floor(template.price * PLATFORM_FEE_RATE);
        const netEarning = template.price - platformFee;

        await prisma.templateEarning.create({
          data: {
            sellerId: template.userId,
            templateId: template.id,
            purchaseId: purchase.id,
            saleAmount: template.price,
            platformFee,
            netEarning,
            status: "AVAILABLE",
          },
        });

        // Update purchase with earning reference
        await prisma.templatePurchase.update({
          where: { id: purchase.id },
          data: { earningId: purchase.id },
        });
      }

      return purchase;
    }),

  // Create Stripe/Polar checkout session for paid template
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await prisma.template.findUnique({
        where: { id: input.templateId },
        include: {
          user: { select: { name: true } },
        },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      if (template.price === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This template is free",
        });
      }

      // Check if already purchased
      const existing = await prisma.templatePurchase.findUnique({
        where: {
          userId_templateId: {
            userId: ctx.auth.user.id,
            templateId: input.templateId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already own this template",
        });
      }

      // Can't buy your own template
      if (template.userId === ctx.auth.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot purchase your own template",
        });
      }

      // Create a pending purchase record
      const pendingPurchase = await prisma.templatePurchase.create({
        data: {
          userId: ctx.auth.user.id,
          templateId: input.templateId,
          pricePaid: template.price,
          currency: template.currency,
          paymentStatus: "pending",
        },
      });

      // In a real implementation, create Stripe checkout session here
      // For now, return a mock checkout URL with the purchase ID
      const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/templates/checkout?purchaseId=${pendingPurchase.id}`;

      return {
        checkoutUrl,
        purchaseId: pendingPurchase.id,
        amount: template.price,
        currency: template.currency,
      };
    }),

  // Complete a template purchase (called after payment)
  completePurchase: protectedProcedure
    .input(
      z.object({
        purchaseId: z.string(),
        paymentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const purchase = await prisma.templatePurchase.findFirst({
        where: {
          id: input.purchaseId,
          userId: ctx.auth.user.id,
          paymentStatus: "pending",
        },
        include: {
          template: true,
        },
      });

      if (!purchase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase not found or already completed",
        });
      }

      // Platform fee rate (10%)
      const PLATFORM_FEE_RATE = 0.10;
      const platformFee = Math.floor(purchase.pricePaid * PLATFORM_FEE_RATE);
      const netEarning = purchase.pricePaid - platformFee;

      // Create earning for seller
      const earning = await prisma.templateEarning.create({
        data: {
          sellerId: purchase.template.userId,
          templateId: purchase.templateId,
          purchaseId: purchase.id,
          saleAmount: purchase.pricePaid,
          platformFee,
          netEarning,
          status: "AVAILABLE",
        },
      });

      // Update purchase as completed
      await prisma.templatePurchase.update({
        where: { id: purchase.id },
        data: {
          paymentId: input.paymentId,
          paymentStatus: "completed",
          earningId: earning.id,
        },
      });

      return { success: true, purchaseId: purchase.id };
    }),

  // Get sales stats for template creator
  getMySalesStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;

    // Get total earnings
    const [totalEarnings, pendingEarnings, availableEarnings, withdrawnEarnings] = await Promise.all([
      prisma.templateEarning.aggregate({
        where: { sellerId: userId },
        _sum: { netEarning: true },
        _count: true,
      }),
      prisma.templateEarning.aggregate({
        where: { sellerId: userId, status: "PENDING" },
        _sum: { netEarning: true },
      }),
      prisma.templateEarning.aggregate({
        where: { sellerId: userId, status: "AVAILABLE" },
        _sum: { netEarning: true },
      }),
      prisma.templateEarning.aggregate({
        where: { sellerId: userId, status: "WITHDRAWN" },
        _sum: { netEarning: true },
      }),
    ]);

    // Get recent sales
    const recentSales = await prisma.templateEarning.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        templateId: true,
        saleAmount: true,
        platformFee: true,
        netEarning: true,
        status: true,
        createdAt: true,
      },
    });

    // Get template IDs with sales
    const templateIds = [...new Set(recentSales.map((s) => s.templateId))];
    const templates = await prisma.template.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true },
    });
    const templateMap = new Map(templates.map((t) => [t.id, t.name]));

    return {
      totalEarnings: totalEarnings._sum.netEarning || 0,
      totalSales: totalEarnings._count,
      pendingEarnings: pendingEarnings._sum.netEarning || 0,
      availableEarnings: availableEarnings._sum.netEarning || 0,
      withdrawnEarnings: withdrawnEarnings._sum.netEarning || 0,
      recentSales: recentSales.map((s) => ({
        ...s,
        templateName: templateMap.get(s.templateId) || "Unknown",
      })),
    };
  }),

  // Create a workflow from a template
  useTemplate: premiumProcedure
    .input(
      z.object({
        templateId: z.string(),
        workflowName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await prisma.template.findUnique({
        where: { id: input.templateId },
        include: {
          purchases: {
            where: { userId: ctx.auth.user.id },
            select: { id: true },
          },
        },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // Check access
      const isOwner = template.userId === ctx.auth.user.id;
      const hasPurchased = template.purchases.length > 0;
      const isFreeOrPublic =
        template.visibility === "PUBLIC" || template.price === 0;

      if (!isOwner && !hasPurchased && !isFreeOrPublic) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this template",
        });
      }

      // Create the workflow with nodes and connections from template
      const nodes = template.nodes as Array<{
        id: string;
        type: NodeType;
        position: { x: number; y: number };
        data: Prisma.InputJsonValue;
      }>;

      const connections = template.connections as Array<{
        id: string;
        source: string;
        target: string;
        sourceHandle: string | null;
        targetHandle: string | null;
      }>;

      // Generate new IDs for nodes to avoid conflicts
      const idMap = new Map<string, string>();
      nodes.forEach((node) => {
        idMap.set(node.id, `${node.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      });

      const workflow = await prisma.workflow.create({
        data: {
          name: input.workflowName,
          userId: ctx.auth.user.id,
          nodes: {
            create: nodes.map((node) => ({
              id: idMap.get(node.id)!,
              name: node.type || "unknown",
              type: node.type,
              position: node.position,
              data: node.data || {},
            })),
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Create connections with new node IDs
      if (connections.length > 0) {
        await prisma.connection.createMany({
          data: connections.map((conn) => ({
            workflowId: workflow.id,
            fromNodeId: idMap.get(conn.source)!,
            toNodeId: idMap.get(conn.target)!,
            fromOutput: conn.sourceHandle || "main",
            toInput: conn.targetHandle || "main",
          })),
        });
      }

      // Increment usage count
      await prisma.template.update({
        where: { id: input.templateId },
        data: { usageCount: { increment: 1 } },
      });

      return workflow;
    }),

  // Get templates the user has purchased
  getMyPurchases: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      const [purchases, totalCount] = await Promise.all([
        prisma.templatePurchase.findMany({
          where: { userId: ctx.auth.user.id },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            template: {
              select: {
                id: true,
                name: true,
                description: true,
                thumbnail: true,
                category: true,
                usageCount: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.templatePurchase.count({ where: { userId: ctx.auth.user.id } }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items: purchases,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),
});

