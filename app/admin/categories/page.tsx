"use client";

import { useState, useEffect } from "react";
import { EntityList } from "@/components/admin/entity-list";
import { AdminNavMobile } from "@/components/admin/admin-nav";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  _count: {
    items: number;
    itemHistory: number;
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  async function handleAdd(name: string) {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add category");
    }
  }

  async function handleEdit(id: string, name: string) {
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update category");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/categories?id=${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete category");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminNavMobile />

      <EntityList
        title="Categories"
        entities={categories}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchCategories}
      />
    </div>
  );
}
