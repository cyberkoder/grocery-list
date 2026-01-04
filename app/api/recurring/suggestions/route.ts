import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find items that are recurring (purchased 3+ times with interval < 30 days)
    // and suggest items where lastAddedAt + interval is within next 7 days
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get recurring items with their history
    const recurringItems = await prisma.itemHistory.findMany({
      where: {
        isRecurring: true,
        purchaseIntervalDays: { not: null },
        storeId: { not: null },
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { lastAddedAt: "desc" },
    });

    // Filter to items that are due soon
    const suggestions = recurringItems
      .filter((item) => {
        if (!item.lastAddedAt || !item.purchaseIntervalDays || !item.store) return false;
        const nextDueDate = new Date(
          item.lastAddedAt.getTime() + item.purchaseIntervalDays * 24 * 60 * 60 * 1000
        );
        // Suggest if due within next 7 days or overdue
        return nextDueDate <= sevenDaysFromNow;
      })
      .map((item) => {
        const nextDueDate = new Date(
          item.lastAddedAt!.getTime() + item.purchaseIntervalDays! * 24 * 60 * 60 * 1000
        );
        const daysUntilDue = Math.ceil(
          (nextDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        return {
          id: item.id,
          name: item.name,
          categoryId: item.categoryId,
          categoryName: item.category.name,
          categoryIcon: item.category.icon,
          storeId: item.storeId!,
          storeName: item.store!.name,
          defaultQuantity: item.defaultQuantity,
          defaultUnit: item.defaultUnit,
          intervalDays: item.purchaseIntervalDays,
          daysUntilDue,
          isOverdue: daysUntilDue < 0,
        };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue); // Most urgent first

    return NextResponse.json(suggestions);
  } catch (err) {
    console.error("Failed to fetch recurring suggestions:", err);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
