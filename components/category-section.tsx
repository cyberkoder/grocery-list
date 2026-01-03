"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ItemCard } from "./item-card";
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

interface CategorySectionProps {
  name: string;
  items: Item[];
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

export function CategorySection({ name, items, categories = [], stores = [], onToggle, onDelete, onEdit }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const uncheckedCount = items.filter((item) => !item.checked).length;

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-1.5 text-left touch-manipulation"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <h2 className="font-medium text-base">{name}</h2>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
            uncheckedCount > 0
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {uncheckedCount}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              categories={categories}
              stores={stores}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
