"use client";

import { useState, useEffect } from "react";
import { AdminNavMobile } from "@/components/admin/admin-nav";
import { Loader2, Shield, ShieldOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  itemCount: number;
  tripCount: number;
  lastActivity: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function toggleAdmin(id: string, currentStatus: boolean) {
    setTogglingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isAdmin: !currentStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update user");
        return;
      }

      fetchUsers();
    } finally {
      setTogglingId(null);
    }
  }

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
        <h2 className="text-xl font-bold">Users</h2>
        <p className="text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No users found.
          </div>
        ) : (
          <div className="divide-y">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    user.isAdmin
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <User className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{user.name}</p>
                    {user.isAdmin && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>{user.itemCount} items</span>
                    <span>{user.tripCount} trips</span>
                    {user.lastActivity && (
                      <span>
                        Active{" "}
                        {formatDistanceToNow(new Date(user.lastActivity), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAdmin(user.id, user.isAdmin)}
                  disabled={togglingId === user.id}
                >
                  {togglingId === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : user.isAdmin ? (
                    <>
                      <ShieldOff className="h-4 w-4 mr-1" />
                      Remove Admin
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-1" />
                      Make Admin
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
