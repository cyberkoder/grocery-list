"use client";

import { useState, useRef } from "react";
import {
  Trash2, Pencil, Check, X, Apple, Milk, Beef, IceCream,
  Cookie, Coffee, Package, Sparkles, ShoppingCart
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./user-avatar";
import { ItemImage } from "./item-image";

interface Category {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  note: string | null;
  checked: boolean;
  addedBy: { name: string };
  category?: { id: string; name: string; icon?: string };
  store?: { id: string; name: string };
}

interface ItemCardProps {
  item: Item;
  categories?: Category[];
  stores?: Store[];
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, data: {
    name: string;
    quantity: number;
    unit: string;
    note: string;
    categoryId: string;
    storeId: string;
  }) => Promise<void>;
}

const SWIPE_THRESHOLD = 80;

// Category icon mapping
function getCategoryIcon(categoryName?: string) {
  const iconClass = "h-5 w-5";
  switch (categoryName) {
    case "Produce":
      return <Apple className={iconClass} />;
    case "Dairy":
      return <Milk className={iconClass} />;
    case "Meat & Seafood":
      return <Beef className={iconClass} />;
    case "Frozen":
      return <IceCream className={iconClass} />;
    case "Snacks":
      return <Cookie className={iconClass} />;
    case "Beverages":
      return <Coffee className={iconClass} />;
    case "Pantry":
      return <Package className={iconClass} />;
    case "Household":
      return <Sparkles className={iconClass} />;
    default:
      return <ShoppingCart className={iconClass} />;
  }
}

export function ItemCard({ item, categories = [], stores = [], onToggle, onDelete, onEdit }: ItemCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit || "");
  const [note, setNote] = useState(item.note || "");
  const [categoryId, setCategoryId] = useState(item.category?.id || "");
  const [storeId, setStoreId] = useState(item.store?.id || "");

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current) {
      e.preventDefault();
      // Limit swipe distance
      const clampedX = Math.max(-120, Math.min(120, diffX));
      setSwipeX(clampedX);
    }
  }

  function handleTouchEnd() {
    if (!isSwiping) return;
    setIsSwiping(false);

    if (swipeX < -SWIPE_THRESHOLD) {
      // Swiped left - delete
      onDelete(item.id);
    } else if (swipeX > SWIPE_THRESHOLD) {
      // Swiped right - toggle check
      onToggle(item.id, !item.checked);
    }

    // Reset position
    setSwipeX(0);
    isHorizontalSwipe.current = null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId || !storeId || !onEdit) return;

    setLoading(true);
    try {
      await onEdit(item.id, {
        name: name.trim(),
        quantity: parseInt(quantity) || 1,
        unit: unit.trim(),
        note: note.trim(),
        categoryId,
        storeId,
      });
      setEditOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function openEdit() {
    setName(item.name);
    setQuantity(String(item.quantity));
    setUnit(item.unit || "");
    setNote(item.note || "");
    setCategoryId(item.category?.id || "");
    setStoreId(item.store?.id || "");
    setEditOpen(true);
  }

  // Calculate background indicators based on swipe
  const showCheckIndicator = swipeX > 20;
  const showDeleteIndicator = swipeX < -20;

  return (
    <>
      <div className="relative overflow-hidden rounded-lg">
        {/* Background indicators - full width with icons positioned at edges */}
        <div
          className={cn(
            "absolute inset-0 flex items-center transition-opacity rounded-lg",
            showCheckIndicator ? "opacity-100" : "opacity-0",
            item.checked ? "bg-orange-500" : "bg-green-500"
          )}
        >
          <div className="pl-6">
            {item.checked ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Check className="h-6 w-6 text-white" />
            )}
          </div>
        </div>
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-end bg-destructive transition-opacity rounded-lg",
            showDeleteIndicator ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="pr-6">
            <Trash2 className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Card content */}
        <div
          className={cn(
            "flex items-center gap-2 sm:gap-3 rounded-xl border p-2 sm:p-3 transition-colors relative bg-card shadow-sm",
            item.checked ? "bg-muted/50 opacity-60" : "bg-card",
            !isSwiping && "transition-transform duration-200"
          )}
          style={{ transform: `translateX(${swipeX}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Item Image or Category Icon */}
          <ItemImage
            name={item.name}
            categoryIcon={item.category?.icon}
            size="md"
            className={cn(
              "shrink-0",
              item.checked && "opacity-50"
            )}
          />

          <Checkbox
            checked={item.checked}
            onCheckedChange={(checked) => onToggle(item.id, checked as boolean)}
            className="h-6 w-6 shrink-0 transition-transform active:scale-90"
            aria-label={item.checked ? "Uncheck item" : "Check item"}
          />
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium text-sm sm:text-base", item.checked && "line-through text-muted-foreground")}>
              {item.quantity > 1 && (
                <span className="text-primary font-semibold">{item.quantity}x </span>
              )}
              {item.name}
              {item.unit && <span className="text-muted-foreground font-normal"> ({item.unit})</span>}
            </p>
            {item.note && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.note}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">by {item.addedBy.name}</p>
          </div>
          <div className="flex items-center shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-primary active:scale-95 transition-transform"
                onClick={openEdit}
                aria-label="Edit item"
              >
                <Pencil className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-muted-foreground hover:text-destructive active:scale-95 transition-transform"
              onClick={() => onDelete(item.id)}
              aria-label="Delete item"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Milk, Bread, Eggs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Input
                  id="edit-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="lbs, oz, pack"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-store">Store *</Label>
              <Select value={storeId} onValueChange={setStoreId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">Note (optional)</Label>
              <Input
                id="edit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any special notes..."
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name.trim() || !categoryId || !storeId}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
