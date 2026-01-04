"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  LogOut, Trash2, RefreshCw, Bell, BellOff, ShoppingCart,
  Search, Plus, MoreVertical, Check, Apple, Milk, Beef,
  IceCream, Cookie, Coffee, Wine, Sparkles, Package, ChevronDown, ChevronRight, Receipt, Settings
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemCard } from "./item-card";
import { AddItemDrawer } from "./add-item-drawer";
import { UserAvatar } from "./user-avatar";
import { ReceiptScanner } from "./receipt-scanner";
import { RecurringSuggestions } from "./recurring-suggestions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface ItemSuggestion {
  id: string;
  name: string;
  categoryId: string;
  storeId: string | null;
  defaultQuantity: number;
  defaultUnit: string | null;
}

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  "Produce": <Apple className="h-4 w-4" />,
  "Dairy": <Milk className="h-4 w-4" />,
  "Meat & Seafood": <Beef className="h-4 w-4" />,
  "Frozen": <IceCream className="h-4 w-4" />,
  "Snacks": <Cookie className="h-4 w-4" />,
  "Beverages": <Coffee className="h-4 w-4" />,
  "Pantry": <Package className="h-4 w-4" />,
  "Household": <Sparkles className="h-4 w-4" />,
  "default": <ShoppingCart className="h-4 w-4" />,
};

export function GroceryList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [frequentItems, setFrequentItems] = useState<ItemSuggestion[]>([]);
  const [addingQuick, setAddingQuick] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [receiptScannerOpen, setReceiptScannerOpen] = useState(false);

  // Load expanded categories from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("expandedCategories");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExpandedCategories(new Set(parsed));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Toggle category expansion
  function toggleCategory(categoryName: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      // Save to localStorage
      localStorage.setItem("expandedCategories", JSON.stringify(Array.from(next)));
      return next;
    });
  }

  const fetchData = useCallback(async () => {
    try {
      const [storesRes, categoriesRes, suggestionsRes] = await Promise.all([
        fetch("/api/stores"),
        fetch("/api/categories"),
        fetch("/api/suggestions"),
      ]);

      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData);
        // Auto-select first store with items, or first store
        const storeWithItems = storesData.find((s: Store) => s.items.length > 0);
        if (!selectedStoreId) {
          setSelectedStoreId(storeWithItems?.id || storesData[0]?.id || null);
        }
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (suggestionsRes.ok) {
        const suggestionsData = await suggestionsRes.json();
        setFrequentItems(suggestionsData.frequent || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStoreId]);

  const requestNotificationPermission = useCallback(async (manual = false) => {
    if (!("Notification" in window)) {
      if (manual) alert("Notifications are not supported in this browser.");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      return;
    }

    if (Notification.permission === "denied") {
      if (manual) alert("Notifications were previously blocked. Please enable them in your browser settings.");
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
        if (manual) alert("Notifications enabled! You'll receive reminders at 9am.");
      } catch (error) {
        console.error("Failed to subscribe to push:", error);
        if (manual) alert("Failed to enable notifications. Please try again.");
      }
    } else if (manual) {
      alert("Notifications were not enabled.");
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchData();
      requestNotificationPermission();

      // Auto-refresh every 10 seconds for real-time updates
      const refreshInterval = setInterval(() => {
        fetchData();
      }, 10000);

      return () => clearInterval(refreshInterval);
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

  async function handleQuickAdd(suggestion: ItemSuggestion) {
    if (!suggestion.storeId || !suggestion.categoryId) return;

    setAddingQuick(suggestion.id);
    try {
      await handleAddItem({
        name: suggestion.name,
        quantity: suggestion.defaultQuantity || 1,
        unit: suggestion.defaultUnit || "",
        note: "",
        categoryId: suggestion.categoryId,
        storeId: suggestion.storeId,
      });
    } finally {
      setAddingQuick(null);
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

  // Play a satisfying sound when checking off an item
  function playCheckSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant "ding" sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio not supported, ignore
    }
  }

  // Trigger haptic feedback
  function triggerHaptic() {
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short 50ms vibration
    }
  }

  async function handleToggleItem(id: string, checked: boolean) {
    // Provide feedback when checking off an item (not when unchecking)
    if (checked) {
      playCheckSound();
      triggerHaptic();
    }

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

    fetchData();
  }

  async function handleDeleteItem(id: string) {
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

  // Get items by category for selected store
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

  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const storeItems = selectedStore?.items || [];
  const itemsByCategory = getItemsByCategory(storeItems);
  const totalItems = stores.reduce((sum, store) => sum + store.items.length, 0);
  const checkedItems = stores.reduce(
    (sum, store) => sum + store.items.filter((item) => item.checked).length,
    0
  );
  const uncheckedInStore = storeItems.filter(i => !i.checked).length;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <ShoppingCart className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading your list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground safe-area-header">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {session?.user?.name ? (
              <UserAvatar name={session.user.name} size="lg" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="font-semibold text-lg">Grocery List</h1>
              <p className="text-xs text-primary-foreground/70">
                {session?.user?.name ? `Hi, ${session.user.name.split(' ')[0]}` : "Welcome"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-primary-foreground hover:bg-white/20"
              onClick={() => {
                setRefreshing(true);
                fetchData();
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-foreground hover:bg-white/20">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {session?.user?.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setReceiptScannerOpen(true)}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Scan Receipt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => requestNotificationPermission(true)}>
                  {notificationsEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                  {notificationsEnabled ? "Notifications On" : "Enable Notifications"}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center">Theme</span>
                    <ThemeToggle />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to log out?")) {
                      signOut();
                    }
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Store Tabs - sorted by unchecked item count */}
        <div className="overflow-x-auto scrollbar-hide max-w-7xl mx-auto">
          <div className="flex gap-2 px-4 lg:px-8 pb-3 min-w-max">
            {[...stores]
              .sort((a, b) => {
                const aUnchecked = a.items.filter(i => !i.checked).length;
                const bUnchecked = b.items.filter(i => !i.checked).length;
                return bUnchecked - aUnchecked; // Most items first
              })
              .map((store) => {
                const storeUnchecked = store.items.filter(i => !i.checked).length;
                const isSelected = store.id === selectedStoreId;
                return (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStoreId(store.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      isSelected
                        ? "bg-white text-primary shadow-md"
                        : storeUnchecked > 0
                          ? "bg-white/20 text-primary-foreground hover:bg-white/30"
                          : "bg-white/10 text-primary-foreground/60 hover:bg-white/20"
                    }`}
                  >
                    {store.name}
                    {storeUnchecked > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        isSelected ? "bg-primary/10 text-primary" : "bg-white/20"
                      }`}>
                        {storeUnchecked}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-card border-b px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{totalItems - checkedItems}</p>
                <p className="text-xs text-muted-foreground">items left</p>
              </div>
            </div>
            {checkedItems > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{checkedItems}</p>
                  <p className="text-xs text-muted-foreground">completed</p>
                </div>
              </div>
            )}
          </div>
          {checkedItems > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleClearChecked}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Quick Add Row */}
      {frequentItems.length > 0 && (
        <div className="bg-card border-b px-4 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Add</p>
            <div className="flex flex-wrap gap-2">
              {frequentItems.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleQuickAdd(item)}
                  disabled={addingQuick === item.id || !item.storeId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-95 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 space-y-6">
          {/* Recurring Item Suggestions */}
          <RecurringSuggestions
            onAddItem={async (item) => {
              await handleAddItem({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit || "",
                note: "",
                categoryId: item.categoryId,
                storeId: item.storeId,
              });
            }}
          />

          {Object.entries(itemsByCategory).length > 0 ? (
            Object.entries(itemsByCategory).map(([categoryName, items]) => {
              const isExpanded = expandedCategories.has(categoryName);
              const uncheckedCount = items.filter(i => !i.checked).length;
              return (
                <div key={categoryName}>
                  <button
                    onClick={() => toggleCategory(categoryName)}
                    className="w-full flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {categoryIcons[categoryName] || categoryIcons.default}
                    </div>
                    <h2 className="font-semibold text-foreground">{categoryName}</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {uncheckedCount}
                    </span>
                    <div className="ml-auto text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          categories={categories}
                          stores={stores}
                          onToggle={handleToggleItem}
                          onDelete={handleDeleteItem}
                          onEdit={handleEditItem}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingCart className="h-10 w-10 text-primary/50" />
              </div>
              <h2 className="font-semibold text-lg text-foreground">No items yet</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Tap the search bar below to add items
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Search Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-20 safe-area-bottom">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <AddItemDrawer
            categories={categories}
            stores={stores}
            defaultStoreId={selectedStoreId || undefined}
            onAdd={handleAddItem}
            trigger={
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-muted rounded-xl text-left hover:bg-muted/80 transition-colors">
                <Search className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">What do you need?</span>
              </button>
            }
          />
        </div>
      </div>

      {/* Receipt Scanner */}
      <ReceiptScanner
        open={receiptScannerOpen}
        onClose={() => setReceiptScannerOpen(false)}
        onItemsFound={(items) => {
          console.log("Receipt items found:", items);
          alert(`Found ${items.length} items on receipt!\n\n${items.map(i => `- ${i.name} (${i.quantity}x)`).join('\n')}`);
        }}
      />
    </div>
  );
}
