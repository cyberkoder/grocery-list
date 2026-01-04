"use client";

import { useState, useEffect } from "react";
import { AdminNavMobile } from "@/components/admin/admin-nav";
import { Loader2, History, ShoppingCart } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface ShoppingTrip {
  id: string;
  userId: string;
  user: { name: string };
  completedAt: string;
  itemCount: number;
  purchases: {
    id: string;
    name: string;
    quantity: number;
    unit: string | null;
    categoryName: string;
    storeName: string;
  }[];
}

export default function HistoryPage() {
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTrips() {
    try {
      const res = await fetch("/api/admin/history");
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrips();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminNavMobile />

      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History className="h-5 w-5" />
          Shopping History
        </h2>
        <p className="text-muted-foreground">
          View past shopping trips and purchases
        </p>
      </div>

      {trips.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            No shopping trips recorded yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Trips are recorded when items are cleared from the list.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-card border rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {format(new Date(trip.completedAt), "EEEE, MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {trip.user.name} - {trip.itemCount} items
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(trip.completedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {trip.purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {purchase.quantity > 1 && (
                        <span className="text-primary font-medium">
                          {purchase.quantity}x{" "}
                        </span>
                      )}
                      {purchase.name}
                      {purchase.unit && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({purchase.unit})
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {purchase.storeName} / {purchase.categoryName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
