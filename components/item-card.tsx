"use client";

import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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

interface ItemCardProps {
  item: Item;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}

export function ItemCard({ item, onToggle, onDelete }: ItemCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        item.checked ? "bg-muted/50 opacity-60" : "bg-card"
      )}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={(checked) => onToggle(item.id, checked as boolean)}
        className="h-5 w-5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium", item.checked && "line-through text-muted-foreground")}>
          {item.quantity > 1 && (
            <span className="text-primary font-semibold">{item.quantity}x </span>
          )}
          {item.name}
          {item.unit && <span className="text-muted-foreground font-normal"> ({item.unit})</span>}
        </p>
        {item.note && (
          <p className="text-sm text-muted-foreground truncate">{item.note}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Added by {item.addedBy.name}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
