import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stores = await prisma.store.findMany({
    orderBy: { order: "asc" },
    include: {
      items: {
        orderBy: [{ checked: "asc" }, { createdAt: "desc" }],
        include: {
          addedBy: {
            select: { name: true },
          },
          category: true,
        },
      },
    },
  });

  return NextResponse.json(stores);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, icon } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get max order
    const maxOrder = await prisma.store.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const store = await prisma.store.create({
      data: {
        name,
        icon: icon || "store",
        order: (maxOrder?.order || 0) + 1,
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Failed to create store" },
      { status: 500 }
    );
  }
}
