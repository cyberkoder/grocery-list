import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

// This endpoint is called by the cron job to send daily reminders
export async function POST(req: Request) {
  try {
    // Verify cron secret (optional security)
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with push subscriptions who have notifications enabled
    const users = await prisma.user.findMany({
      where: {
        pushSubscription: { not: null },
        notifyAt9am: true,
      },
    });

    // Get unchecked items count
    const uncheckedCount = await prisma.item.count({
      where: { checked: false },
    });

    if (uncheckedCount === 0) {
      return NextResponse.json({ message: "No items to notify about" });
    }

    const results = [];

    for (const user of users) {
      if (!user.pushSubscription) continue;

      try {
        const subscription = JSON.parse(user.pushSubscription);
        const result = await sendPushNotification(subscription, {
          title: "Grocery Reminder",
          body: `You have ${uncheckedCount} item${uncheckedCount > 1 ? "s" : ""} on your grocery list`,
          icon: "/icons/icon-192.png",
          url: "/",
        });
        results.push({ userId: user.id, ...result });
      } catch (error) {
        console.error(`Failed to send notification to ${user.id}:`, error);
        results.push({ userId: user.id, success: false, error: String(error) });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
