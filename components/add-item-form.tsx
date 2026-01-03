"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { SuggestionChips } from "./suggestion-chips";

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

interface SuggestionsResponse {
  frequent: ItemSuggestion[];
  recent: ItemSuggestion[];
  matches: ItemSuggestion[];
}

interface AddItemFormProps {
  categories: Category[];
  stores: Store[];
  onAdd: (item: {
    name: string;
    quantity: number;
    unit: string;
    note: string;
    categoryId: string;
    storeId: string;
  }) => Promise<void>;
}

export function AddItemForm({ categories, stores, onAdd }: AddItemFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<ItemSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions when dialog opens
  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch("/api/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSuggestions();
    }
  }, [open, fetchSuggestions]);

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

  // Handle name input change with debounced autocomplete
  function handleNameChange(value: string) {
    setName(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce autocomplete search
    debounceRef.current = setTimeout(() => {
      searchAutocomplete(value);
    }, 300);
  }

  // Handle suggestion selection
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

  // Close autocomplete when clicking outside
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
      setName("");
      setQuantity("1");
      setUnit("");
      setNote("");
      setOpen(false);
      // Refresh suggestions after adding
      fetchSuggestions();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 lg:hidden"
          style={{ aspectRatio: "1/1" }}
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
        </DialogHeader>

        {/* Quick Add Suggestions */}
        <SuggestionChips
          frequent={suggestions?.frequent || []}
          recent={suggestions?.recent || []}
          onSelect={handleSuggestionSelect}
          loading={suggestionsLoading}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              ref={inputRef}
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Milk, Bread, Eggs"
              required
              autoFocus
              autoComplete="off"
            />
            {/* Autocomplete dropdown */}
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div
                ref={autocompleteRef}
                className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto"
              >
                {autocompleteResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSuggestionSelect(item)}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between"
                  >
                    <span>{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.category?.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="lbs, oz, pack"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store">Store *</Label>
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
            <Label htmlFor="category">Category *</Label>
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
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special notes..."
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !name.trim() || !categoryId || !storeId}
          >
            {loading ? "Adding..." : "Add Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Desktop sidebar version of the form
export function AddItemSidebar({ categories, stores, onAdd }: AddItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<ItemSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions on mount
  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch("/api/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

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
      setName("");
      setQuantity("1");
      setUnit("");
      setNote("");
      fetchSuggestions();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <h2 className="font-semibold text-lg">Add Item</h2>

      <SuggestionChips
        frequent={suggestions?.frequent || []}
        recent={suggestions?.recent || []}
        onSelect={handleSuggestionSelect}
        loading={suggestionsLoading}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 relative">
          <Label htmlFor="sidebar-name">Item Name *</Label>
          <Input
            ref={inputRef}
            id="sidebar-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Milk, Bread, Eggs"
            required
            autoComplete="off"
          />
          {showAutocomplete && autocompleteResults.length > 0 && (
            <div
              ref={autocompleteRef}
              className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              {autocompleteResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSuggestionSelect(item)}
                  className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between"
                >
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.category?.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sidebar-quantity">Qty</Label>
            <Input
              id="sidebar-quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sidebar-unit">Unit</Label>
            <Input
              id="sidebar-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="lbs, oz"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sidebar-store">Store *</Label>
          <Select value={storeId} onValueChange={setStoreId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select store" />
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
          <Label htmlFor="sidebar-category">Category *</Label>
          <Select value={categoryId} onValueChange={setCategoryId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
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
          <Label htmlFor="sidebar-note">Note</Label>
          <Input
            id="sidebar-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional notes..."
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !name.trim() || !categoryId || !storeId}
        >
          {loading ? "Adding..." : "Add Item"}
        </Button>
      </form>
    </div>
  );
}
