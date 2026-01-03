"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, RefreshCw, Bell, BellOff, ShoppingCart, ChevronDown, ChevronRight, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategorySection } from "./category-section";
import { AddItemForm, AddItemSidebar } from "./add-item-form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  note: string | null;
  checked: boolean;
  addedBy: { name: string };
  category: { id: string; name: string };
  store: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
  items: Item[];
}

export function GroceryList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [storesRes, categoriesRes] = await Promise.all([
        fetch("/api/stores"),
        fetch("/api/categories"),
      ]);

      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData);
        // Auto-expand stores that have items
        const storesWithItems = storesData
          .filter((s: Store) => s.items.length > 0)
          .map((s: Store) => s.id);
        setExpandedStores(new Set(storesWithItems));
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      alert("Notifications are already enabled!");
      return;
    }

    if (Notification.permission === "denied") {
      alert("Notifications were previously blocked. Please enable them in your browser settings.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");

    if (permission === "granted") {
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
        alert("Notifications enabled! You'll receive reminders at 9am.");
      } catch (error) {
        console.error("Failed to subscribe to push:", error);
        alert("Failed to enable notifications. Please try again.");
      }
    } else {
      alert("Notifications were not enabled.");
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchData();
      // Auto-request notification permission
      requestNotificationPermission();
    }
  }, [status, router, fetchData, requestNotificationPermission]);

  async function handleAddItem(item: {
    name: string;
    quantity: number;
    unit: string;
    note: string;
    categoryId: string;
    storeId: string;
  }) {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });

    if (res.ok) {
      fetchData();
    }
  }

  async function handleEditItem(id: string, data: {
    name: string;
    quantity: number;
    unit: string;
    note: string;
    categoryId: string;
    storeId: string;
  }) {
    const res = await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });

    if (res.ok) {
      fetchData();
    }
  }

  async function handleToggleItem(id: string, checked: boolean) {
    // Optimistic update
    setStores((prev) =>
      prev.map((store) => ({
        ...store,
        items: store.items.map((item) =>
          item.id === id ? { ...item, checked } : item
        ),
      }))
    );

    await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, checked }),
    });

    // Refetch to update counts
    fetchData();
  }

  async function handleDeleteItem(id: string) {
    // Optimistic update
    setStores((prev) =>
      prev.map((store) => ({
        ...store,
        items: store.items.filter((item) => item.id !== id),
      }))
    );

    await fetch(`/api/items?id=${id}`, {
      method: "DELETE",
    });
  }

  async function handleClearChecked() {
    if (!confirm("Clear all checked items?")) return;

    setStores((prev) =>
      prev.map((store) => ({
        ...store,
        items: store.items.filter((item) => !item.checked),
      }))
    );

    await fetch("/api/items?clearChecked=true", {
      method: "DELETE",
    });
  }

  function toggleStoreExpanded(storeId: string) {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  }

  const totalItems = stores.reduce((sum, store) => sum + store.items.length, 0);
  const checkedItems = stores.reduce(
    (sum, store) => sum + store.items.filter((item) => item.checked).length,
    0
  );

  // Group items by category within each store
  function getItemsByCategory(items: Item[]) {
    const grouped: Record<string, Item[]> = {};
    for (const item of items) {
      const catName = item.category.name;
      if (!grouped[catName]) {
        grouped[catName] = [];
      }
      grouped[catName].push(item);
    }
    return grouped;
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const storesWithItems = stores.filter((store) => store.items.length > 0);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 max-w-lg mx-auto lg:max-w-6xl">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Grocery List</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                setRefreshing(true);
                fetchData();
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={requestNotificationPermission}
              title={notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
            >
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Are you sure you want to log out?")) {
                  signOut();
                }
              }}
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between text-sm max-w-lg mx-auto lg:max-w-6xl">
          <span className="text-muted-foreground">
            {session?.user?.name && `Hi, ${session.user.name}!`}
          </span>
          <div className="flex items-center gap-3">
            <span>
              <span className="font-medium text-primary">{totalItems - checkedItems}</span>
              <span className="text-muted-foreground"> left</span>
            </span>
            {checkedItems > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearChecked}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear {checkedItems}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="px-4 py-4 max-w-lg mx-auto lg:max-w-6xl lg:flex lg:gap-6">
        {/* Grocery List Column */}
        <main className="space-y-3 lg:flex-1">
          {storesWithItems.map((store) => {
            const itemsByCategory = getItemsByCategory(store.items);
            const uncheckedCount = store.items.filter((i) => !i.checked).length;
            const isExpanded = expandedStores.has(store.id);

            return (
              <Collapsible
                key={store.id}
                open={isExpanded}
                onOpenChange={() => toggleStoreExpanded(store.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/15 transition-colors active:bg-primary/20 touch-manipulation">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-primary" />
                      )}
                      <StoreIcon className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{store.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {uncheckedCount} item{uncheckedCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3 pl-2">
                  {Object.entries(itemsByCategory).map(([categoryName, items]) => (
                    <CategorySection
                      key={categoryName}
                      name={categoryName}
                      items={items}
                      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                      stores={stores.map((s) => ({ id: s.id, name: s.name }))}
                      onToggle={handleToggleItem}
                      onDelete={handleDeleteItem}
                      onEdit={handleEditItem}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

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

        {/* Desktop Sidebar - Always visible on lg screens */}
        <aside className="hidden lg:block lg:w-80 lg:shrink-0 lg:sticky lg:top-20 lg:self-start">
          <AddItemSidebar
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            stores={stores.map((s) => ({ id: s.id, name: s.name }))}
            onAdd={handleAddItem}
          />
        </aside>
      </div>

      {/* Add Item FAB */}
      <AddItemForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        onAdd={handleAddItem}
      />
    </div>
  );
}
