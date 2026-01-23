"use client";

import { ShoppingCart, ClipboardList, Calendar } from "lucide-react";

interface UserMetricsProps {
  itemsAdded: number;
  shoppingTrips: number;
  memberSince: Date;
}

export function UserMetrics({ itemsAdded, shoppingTrips, memberSince }: UserMetricsProps) {
  const formattedDate = new Date(memberSince).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
        <ClipboardList className="h-5 w-5 text-primary mb-2" />
        <span className="text-2xl font-bold">{itemsAdded}</span>
        <span className="text-xs text-muted-foreground text-center">Items Added</span>
      </div>
      <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
        <ShoppingCart className="h-5 w-5 text-primary mb-2" />
        <span className="text-2xl font-bold">{shoppingTrips}</span>
        <span className="text-xs text-muted-foreground text-center">Trips</span>
      </div>
      <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
        <Calendar className="h-5 w-5 text-primary mb-2" />
        <span className="text-lg font-bold">{formattedDate}</span>
        <span className="text-xs text-muted-foreground text-center">Member Since</span>
      </div>
    </div>
  );
}
