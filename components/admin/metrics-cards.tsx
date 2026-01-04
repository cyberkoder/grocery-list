"use client";

import { ShoppingCart, CheckCircle, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-4 lg:p-6 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp
                className={cn(
                  "h-3 w-3",
                  trend.value >= 0 ? "text-green-500" : "text-red-500"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.value >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface Stats {
  totalItems: number;
  itemsThisWeek: number;
  activeUsers: number;
  shoppingTrips: number;
  itemsLastWeek?: number;
}

export function MetricsCards({ stats }: { stats: Stats }) {
  const weeklyTrend = stats.itemsLastWeek
    ? Math.round(
        ((stats.itemsThisWeek - stats.itemsLastWeek) / stats.itemsLastWeek) *
          100
      )
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Items"
        value={stats.totalItems.toLocaleString()}
        subtitle="All time"
        icon={<ShoppingCart className="h-5 w-5" />}
      />
      <MetricCard
        title="This Week"
        value={stats.itemsThisWeek}
        subtitle="Items added"
        icon={<TrendingUp className="h-5 w-5" />}
        trend={
          stats.itemsLastWeek
            ? { value: weeklyTrend, label: "vs last week" }
            : undefined
        }
      />
      <MetricCard
        title="Active Users"
        value={stats.activeUsers}
        subtitle="Last 30 days"
        icon={<Users className="h-5 w-5" />}
      />
      <MetricCard
        title="Shopping Trips"
        value={stats.shoppingTrips}
        subtitle="Completed"
        icon={<CheckCircle className="h-5 w-5" />}
      />
    </div>
  );
}
