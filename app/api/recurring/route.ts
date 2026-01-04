import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Analyze purchase patterns and update recurring status
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all item history with their purchase records
    const itemHistories = await prisma.itemHistory.findMany({
      where: {
        addCount: { gte: 3 }, // Only analyze items purchased 3+ times
      },
      include: {
        purchases: {
          orderBy: { purchasedAt: "asc" },
          select: { purchasedAt: true },
        },
      },
    });

    let updatedCount = 0;

    for (const item of itemHistories) {
      if (item.purchases.length < 3) continue;

      // Calculate intervals between purchases
      const intervals: number[] = [];
      for (let i = 1; i < item.purchases.length; i++) {
        const prevDate = item.purchases[i - 1].purchasedAt;
        const currDate = item.purchases[i].purchasedAt;
        const daysDiff = Math.round(
          (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        intervals.push(daysDiff);
      }

      if (intervals.length === 0) continue;

      // Calculate average interval
      const avgInterval = Math.round(
        intervals.reduce((a, b) => a + b, 0) / intervals.length
      );

      // Mark as recurring if average interval is less than 30 days
      const isRecurring = avgInterval > 0 && avgInterval <= 30;

      await prisma.itemHistory.update({
        where: { id: item.id },
        data: {
          purchaseIntervalDays: avgInterval,
          isRecurring,
        },
      });

      updatedCount++;
    }

    return NextResponse.json({
      message: `Analyzed ${itemHistories.length} items, updated ${updatedCount} recurring patterns`
    });
  } catch (err) {
    console.error("Failed to analyze recurring patterns:", err);
    return NextResponse.json(
      { error: "Failed to analyze patterns" },
      { status: 500 }
    );
  }
}

// Get all recurring items for admin view
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recurringItems = await prisma.itemHistory.findMany({
      where: { isRecurring: true },
      include: {
        category: { select: { name: true } },
        store: { select: { name: true } },
      },
      orderBy: { addCount: "desc" },
    });

    return NextResponse.json(recurringItems);
  } catch (err) {
    console.error("Failed to fetch recurring items:", err);
    return NextResponse.json(
      { error: "Failed to fetch recurring items" },
      { status: 500 }
    );
  }
}
