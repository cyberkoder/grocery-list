"use client";

import { useState, useEffect } from "react";
import { EntityList } from "@/components/admin/entity-list";
import { AdminNavMobile } from "@/components/admin/admin-nav";
import { Loader2 } from "lucide-react";

interface Store {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  _count: {
    items: number;
    itemHistory: number;
  };
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchStores() {
    try {
      const res = await fetch("/api/admin/stores");
      if (res.ok) {
        const data = await res.json();
        setStores(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStores();
  }, []);

  async function handleAdd(name: string) {
    const res = await fetch("/api/admin/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add store");
    }
  }

  async function handleEdit(id: string, name: string) {
    const res = await fetch("/api/admin/stores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update store");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/stores?id=${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete store");
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
        title="Stores"
        entities={stores}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchStores}
      />
    </div>
  );
}
