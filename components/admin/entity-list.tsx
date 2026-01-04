"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Entity {
  id: string;
  name: string;
  icon?: string | null;
  order: number;
  _count?: {
    items: number;
    itemHistory: number;
  };
}

interface EntityListProps {
  title: string;
  entities: Entity[];
  onAdd: (name: string, icon?: string) => Promise<void>;
  onEdit: (id: string, name: string, icon?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export function EntityList({
  title,
  entities,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}: EntityListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openAddDialog() {
    setEditingEntity(null);
    setName("");
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(entity: Entity) {
    setEditingEntity(entity);
    setName(entity.name);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (editingEntity) {
        await onEdit(editingEntity.id, name.trim());
      } else {
        await onAdd(name.trim());
      }
      setDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this?")) return;

    setDeletingId(id);
    try {
      await onDelete(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {entities.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No {title.toLowerCase()} yet. Add one to get started.
          </div>
        ) : (
          <div className="divide-y">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className="flex items-center gap-3 p-4 hover:bg-muted/50"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <div className="flex-1">
                  <p className="font-medium">{entity.name}</p>
                  {entity._count && (
                    <p className="text-xs text-muted-foreground">
                      {entity._count.items} items, {entity._count.itemHistory}{" "}
                      in history
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(entity)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(entity.id)}
                    disabled={deletingId === entity.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingId === entity.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingEntity ? "Save" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
