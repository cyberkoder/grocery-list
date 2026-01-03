import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      items: {
        orderBy: [{ checked: "asc" }, { createdAt: "desc" }],
        include: {
          addedBy: {
            select: { name: true },
          },
        },
      },
    },
  });

  return NextResponse.json(categories);
}
