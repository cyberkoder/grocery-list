"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, RefreshCw, Bell, BellOff, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategorySection } from "./category-section";
import { AddItemForm } from "./add-item-form";

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  note: string | null;
  checked: boolean;
  addedBy: { name: string };
}

interface Category {
  id: string;
  name: string;
  items: Item[];
}

export function GroceryList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchCategories();
      // Check notification permission
      if ("Notification" in window) {
        setNotificationsEnabled(Notification.permission === "granted");
      }
    }
  }, [status, router, fetchCategories]);

  async function handleAddItem(item: {
    name: string;
    quantity: number;
    unit: string;
    note: string;
    categoryId: string;
  }) {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });

    if (res.ok) {
      fetchCategories();
    }
  }

  async function handleToggleItem(id: string, checked: boolean) {
    // Optimistic update
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === id ? { ...item, checked } : item
        ),
      }))
    );

    await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, checked }),
    });
  }

  async function handleDeleteItem(id: string) {
    // Optimistic update
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.id !== id),
      }))
    );

    await fetch(`/api/items?id=${id}`, {
      method: "DELETE",
    });
  }

  async function handleClearChecked() {
    if (!confirm("Clear all checked items?")) return;

    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => !item.checked),
      }))
    );

    await fetch("/api/items?clearChecked=true", {
      method: "DELETE",
    });
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");

    if (permission === "granted") {
      // Subscribe to push notifications
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
      } catch (error) {
        console.error("Failed to subscribe to push:", error);
      }
    }
  }

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedItems = categories.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.checked).length,
    0
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Grocery List</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRefreshing(true);
                fetchCategories();
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={requestNotificationPermission}
              title={notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
            >
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b bg-muted/30 px-4 py-2">
        <div className="container flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {session?.user?.name && `Hi, ${session.user.name}!`}
          </span>
          <div className="flex items-center gap-4">
            <span>
              <span className="font-medium text-primary">{totalItems - checkedItems}</span>
              <span className="text-muted-foreground"> items left</span>
            </span>
            {checkedItems > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearChecked}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear {checkedItems} checked
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Categories */}
      <main className="container px-4 py-4 space-y-4">
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            name={category.name}
            items={category.items}
            onToggle={handleToggleItem}
            onDelete={handleDeleteItem}
          />
        ))}

        {totalItems === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="font-medium text-lg">Your list is empty</h2>
            <p className="text-muted-foreground text-sm">
              Tap the + button to add your first item
            </p>
          </div>
        )}
      </main>

      {/* Add Item FAB */}
      <AddItemForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onAdd={handleAddItem}
      />
    </div>
  );
}
