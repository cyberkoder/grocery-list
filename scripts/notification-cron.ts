// Daily notification cron job
// Run with: npx tsx scripts/notification-cron.ts
// Schedule with cron: 0 9 * * * cd /app && npx tsx scripts/notification-cron.ts

async function sendDailyNotifications() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET || "";

  try {
    const response = await fetch(`${baseUrl}/api/push/send?secret=${cronSecret}`, {
      method: "POST",
    });

    const result = await response.json();
    console.log(`[${new Date().toISOString()}] Notification result:`, result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send notifications:`, error);
    process.exit(1);
  }
}

sendDailyNotifications();
