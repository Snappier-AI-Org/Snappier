import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 }
      );
    }

    const execution = await prisma.execution.findFirst({
      where: {
        workflowId,
        workflow: {
          userId: session.user.id,
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        output: true,
        error: true,
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ execution });
  } catch (error) {
    console.error("Error fetching latest execution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
