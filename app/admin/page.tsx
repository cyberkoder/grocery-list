"use client";

import { useState, useEffect } from "react";
import { MetricsCards } from "@/components/admin/metrics-cards";
import { AdminNavMobile } from "@/components/admin/admin-nav";
import { Loader2, ShoppingCart, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentItem {
  id: string;
  name: string;
  quantity: number;
  addedBy: string;
  store: string;
  category: string;
  createdAt: string;
}

interface Stats {
  totalItems: number;
  itemsThisWeek: number;
  itemsLastWeek: number;
  activeUsers: number;
  shoppingTrips: number;
  recentItems: RecentItem[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError("Failed to load dashboard data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-destructive">{error || "Failed to load data"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminNavMobile />

      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your grocery list activity
        </p>
      </div>

      <MetricsCards stats={stats} />

      {/* Recent Activity */}
      <div className="bg-card border rounded-xl p-4 lg:p-6 shadow-sm">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </h3>

        {stats.recentItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent items</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {item.quantity > 1 && (
                      <span className="text-primary">{item.quantity}x </span>
                    )}
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.addedBy} added to {item.store} - {item.category}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
