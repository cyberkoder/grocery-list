"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { Search, ScanBarcode } from "lucide-react";
import { VoiceInput } from "./voice-input";
import { BarcodeScanner } from "./barcode-scanner";
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface Category {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
}

interface ItemSuggestion {
  id: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string } | null;
  storeId: string | null;
  store: { id: string; name: string } | null;
  defaultQuantity: number;
  defaultUnit: string | null;
  addCount: number;
}

interface AddItemDrawerProps {
  categories: Category[];
  stores: Store[];
  defaultStoreId?: string;
  onAdd: (item: {
    name: string;
    quantity: number;
    unit: string;
    note: string;
    categoryId: string;
    storeId: string;
  }) => Promise<void>;
  trigger: ReactNode;
}

export function AddItemDrawer({ categories, stores, defaultStoreId, onAdd, trigger }: AddItemDrawerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState(defaultStoreId || "");
  const [scannerOpen, setScannerOpen] = useState(false);

  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<ItemSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update storeId when defaultStoreId changes
  useEffect(() => {
    if (defaultStoreId && !storeId) {
      setStoreId(defaultStoreId);
    }
  }, [defaultStoreId, storeId]);

  // Autocomplete search
  const searchAutocomplete = useCallback(async (query: string) => {
    if (query.length < 1) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    try {
      const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setAutocompleteResults(data.matches || []);
        setShowAutocomplete(data.matches?.length > 0);
      }
    } catch (error) {
      console.error("Autocomplete search failed:", error);
    }
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAutocomplete(value);
    }, 300);
  }

  function handleSuggestionSelect(suggestion: ItemSuggestion) {
    setName(suggestion.name);
    setQuantity(String(suggestion.defaultQuantity || 1));
    setUnit(suggestion.defaultUnit || "");
    if (suggestion.categoryId) {
      setCategoryId(suggestion.categoryId);
    }
    if (suggestion.storeId) {
      setStoreId(suggestion.storeId);
    }
    setShowAutocomplete(false);
    setAutocompleteResults([]);
  }

  function handleBarcodeScan(product: { name: string; barcode: string }) {
    setName(product.name);
    // Try to find the product in our database
    searchAutocomplete(product.name);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId || !storeId) return;

    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        quantity: parseInt(quantity) || 1,
        unit: unit.trim(),
        note: note.trim(),
        categoryId,
        storeId,
      });
      // Reset form
      setName("");
      setQuantity("1");
      setUnit("");
      setNote("");
      setCategoryId("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left border-b pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Add Item
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8 pt-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="drawer-name">What do you need?</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="drawer-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Search or type item name..."
                  required
                  autoComplete="off"
                  className="flex-1 h-12 text-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={() => setScannerOpen(true)}
                  disabled={loading}
                >
                  <ScanBarcode className="h-5 w-5" />
                </Button>
                <VoiceInput
                  onResult={(text) => handleNameChange(text)}
                  disabled={loading}
                />
              </div>
              {/* Autocomplete dropdown */}
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div
                  ref={autocompleteRef}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-xl shadow-lg max-h-48 overflow-y-auto"
                >
                  {autocompleteResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSuggestionSelect(item)}
                      className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {item.category?.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drawer-quantity">Quantity</Label>
                <Input
                  id="drawer-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drawer-unit">Unit</Label>
                <Input
                  id="drawer-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="lbs, oz, pack"
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-store">Store</Label>
              <Select value={storeId} onValueChange={setStoreId} required>
                <SelectTrigger className="h-11">
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
              <Label htmlFor="drawer-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger className="h-11">
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
              <Label htmlFor="drawer-note">Note (optional)</Label>
              <Input
                id="drawer-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any special notes..."
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={loading || !name.trim() || !categoryId || !storeId}
            >
              {loading ? "Adding..." : "Add to List"}
            </Button>
          </form>
        </div>
      </DrawerContent>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </Drawer>
  );
}
