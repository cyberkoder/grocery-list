import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all stats in parallel
    const [
      totalItems,
      itemsThisWeek,
      itemsLastWeek,
      activeUsers,
      shoppingTrips,
      recentItems,
    ] = await Promise.all([
      // Total items added (from history)
      prisma.itemHistory.aggregate({
        _sum: { addCount: true },
      }),

      // Items added this week
      prisma.item.count({
        where: {
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // Items added last week (for comparison)
      prisma.item.count({
        where: {
          createdAt: {
            gte: twoWeeksAgo,
            lt: oneWeekAgo,
          },
        },
      }),

      // Active users (who added items in last 30 days)
      prisma.user.count({
        where: {
          items: {
            some: {
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
      }),

      // Shopping trips completed
      prisma.shoppingTrip.count(),

      // Recent items for activity feed
      prisma.item.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          addedBy: { select: { name: true } },
          store: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      totalItems: totalItems._sum.addCount || 0,
      itemsThisWeek,
      itemsLastWeek,
      activeUsers,
      shoppingTrips,
      recentItems: recentItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        addedBy: item.addedBy.name,
        store: item.store.name,
        category: item.category.name,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
