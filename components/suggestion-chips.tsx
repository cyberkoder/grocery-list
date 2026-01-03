"use client";

import { Clock, TrendingUp } from "lucide-react";

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

interface SuggestionChipsProps {
  frequent: ItemSuggestion[];
  recent: ItemSuggestion[];
  onSelect: (suggestion: ItemSuggestion) => void;
  loading?: boolean;
}

export function SuggestionChips({
  frequent,
  recent,
  onSelect,
  loading,
}: SuggestionChipsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 w-20 rounded-full bg-muted animate-pulse shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  // Dedupe: remove items from recent that are already in frequent
  const frequentNames = new Set(frequent.map((f) => f.name.toLowerCase()));
  const filteredRecent = recent.filter(
    (r) => !frequentNames.has(r.name.toLowerCase())
  );

  if (frequent.length === 0 && filteredRecent.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {frequent.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            <TrendingUp className="h-3 w-3" />
            <span>Frequent</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {frequent.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0 active:scale-95"
              >
                {item.name}
                {item.defaultQuantity > 1 && (
                  <span className="text-xs opacity-70">
                    ({item.defaultQuantity}
                    {item.defaultUnit ? ` ${item.defaultUnit}` : ""})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredRecent.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            <Clock className="h-3 w-3" />
            <span>Recent</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filteredRecent.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors shrink-0 active:scale-95"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
