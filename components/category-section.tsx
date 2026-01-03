"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ItemCard } from "./item-card";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  note: string | null;
  checked: boolean;
  addedBy: { name: string };
}

interface CategorySectionProps {
  name: string;
  items: Item[];
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}

export function CategorySection({ name, items, onToggle, onDelete }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const uncheckedCount = items.filter((item) => !item.checked).length;

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
        <h2 className="font-semibold text-lg">{name}</h2>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
            uncheckedCount > 0
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {uncheckedCount} / {items.length}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 pl-7">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
