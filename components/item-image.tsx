"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemImageProps {
  name: string;
  historyId?: string;
  categoryIcon?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const imageSizes = {
  sm: 32,
  md: 40,
  lg: 48,
};

export function ItemImage({
  name,
  historyId,
  categoryIcon,
  size = "md",
  className,
}: ItemImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchImage() {
      try {
        const params = new URLSearchParams({ name });
        if (historyId) params.append("historyId", historyId);

        const res = await fetch(`/api/items/image?${params}`);
        if (res.ok && mounted) {
          const data = await res.json();
          setImageUrl(data.imageUrl);
        }
      } catch {
        // Ignore errors
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchImage();
    return () => { mounted = false; };
  }, [name, historyId]);

  // Show category icon or fallback while loading or on error
  if (loading || error || !imageUrl) {
    return (
      <div
        className={cn(
          "rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground",
          sizeClasses[size],
          className
        )}
      >
        {categoryIcon ? (
          <span className="text-lg">{categoryIcon}</span>
        ) : (
          <Package className="h-4 w-4" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden bg-white flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      <Image
        src={imageUrl}
        alt={name}
        width={imageSizes[size]}
        height={imageSizes[size]}
        className="object-cover w-full h-full"
        onError={() => setError(true)}
        unoptimized // External images
      />
    </div>
  );
}
