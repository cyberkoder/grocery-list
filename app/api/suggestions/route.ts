import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get frequent items (most added)
    const frequent = await prisma.itemHistory.findMany({
      orderBy: { addCount: "desc" },
      take: 5,
      include: {
        category: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
    });

    // Get recent items (last added)
    const recent = await prisma.itemHistory.findMany({
      orderBy: { lastAddedAt: "desc" },
      take: 5,
      include: {
        category: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
    });

    // If query provided, search for matches
    let matches: typeof frequent = [];
    if (query && query.length >= 1) {
      matches = await prisma.itemHistory.findMany({
        where: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        orderBy: { addCount: "desc" },
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          store: { select: { id: true, name: true } },
        },
      });
    }

    return NextResponse.json({
      frequent,
      recent,
      matches,
    });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
