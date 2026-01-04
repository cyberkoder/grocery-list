import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const trips = await prisma.shoppingTrip.findMany({
      orderBy: { completedAt: "desc" },
      take: 50,
      include: {
        user: {
          select: { name: true },
        },
        purchases: {
          orderBy: { purchasedAt: "asc" },
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
            categoryName: true,
            storeName: true,
          },
        },
      },
    });

    return NextResponse.json(trips);
  } catch (err) {
    console.error("Failed to fetch history:", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
