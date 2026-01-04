"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurringSuggestion {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  storeId: string;
  storeName: string;
  defaultQuantity: number;
  defaultUnit: string | null;
  intervalDays: number;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface RecurringSuggestionsProps {
  onAddItem: (item: {
    name: string;
    categoryId: string;
    storeId: string;
    quantity: number;
    unit: string | null;
  }) => void;
}

export function RecurringSuggestions({ onAddItem }: RecurringSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<RecurringSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function fetchSuggestions() {
    try {
      const res = await fetch("/api/recurring/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function handleAdd(suggestion: RecurringSuggestion) {
    setAddingId(suggestion.id);
    try {
      await onAddItem({
        name: suggestion.name,
        categoryId: suggestion.categoryId,
        storeId: suggestion.storeId,
        quantity: suggestion.defaultQuantity,
        unit: suggestion.defaultUnit,
      });
      setDismissed((prev) => new Set(prev).add(suggestion.id));
    } finally {
      setAddingId(null);
    }
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  // Filter out dismissed items
  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.id));

  if (loading || visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Items you might need
        </span>
      </div>

      <div className="space-y-2">
        {visibleSuggestions.slice(0, 5).map((suggestion) => (
          <div
            key={suggestion.id}
            className={cn(
              "flex items-center justify-between gap-3 p-3 rounded-lg bg-background/80 border",
              suggestion.isOverdue
                ? "border-red-300 dark:border-red-800"
                : "border-amber-200 dark:border-amber-800"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{suggestion.categoryIcon}</span>
                <span className="font-medium truncate">{suggestion.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {suggestion.isOverdue ? (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {Math.abs(suggestion.daysUntilDue)} days overdue
                  </span>
                ) : suggestion.daysUntilDue === 0 ? (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    Due today
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Due in {suggestion.daysUntilDue} day{suggestion.daysUntilDue !== 1 ? "s" : ""}
                  </span>
                )}
                <span>•</span>
                <span>{suggestion.storeName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(suggestion.id)}
                className="text-muted-foreground h-8 px-2"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={() => handleAdd(suggestion)}
                disabled={addingId === suggestion.id}
                className="h-8"
              >
                {addingId === suggestion.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {visibleSuggestions.length > 5 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          +{visibleSuggestions.length - 5} more suggestions
        </p>
      )}
    </div>
  );
}
