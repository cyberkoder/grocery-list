"use client";

import { useState } from "react";
import { Trash2, Pencil } from "lucide-react";
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
  category?: { id: string; name: string };
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

export function ItemCard({ item, categories = [], stores = [], onToggle, onDelete, onEdit }: ItemCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit || "");
  const [note, setNote] = useState(item.note || "");
  const [categoryId, setCategoryId] = useState(item.category?.id || "");
  const [storeId, setStoreId] = useState(item.store?.id || "");

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

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 sm:gap-3 rounded-lg border p-2 sm:p-3 transition-colors",
          item.checked ? "bg-muted/50 opacity-60" : "bg-card"
        )}
      >
        <Checkbox
          checked={item.checked}
          onCheckedChange={(checked) => onToggle(item.id, checked as boolean)}
          className="h-5 w-5 shrink-0"
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
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={openEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
