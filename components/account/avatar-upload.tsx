"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  avatarUrl?: string | null;
  name: string;
  onAvatarChange: (url: string | null) => void;
}

export function AvatarUpload({ avatarUrl, name, onAvatarChange }: AvatarUploadProps) {
  const { update } = useSession();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate on client side too
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or WebP image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      onAvatarChange(data.avatarUrl);
      await update(); // Refresh session

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/avatar", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      onAvatarChange(null);
      await update(); // Refresh session

      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed",
      });
    } catch {
      toast({
        title: "Delete failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div
          className={cn(
            "h-20 w-20 rounded-full flex items-center justify-center text-xl font-semibold",
            avatarUrl
              ? "bg-white"
              : "bg-primary/10 text-primary"
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        {(uploading || deleting) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || deleting}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
        >
          <Camera className="h-4 w-4 mr-2" />
          {avatarUrl ? "Change Photo" : "Upload Photo"}
        </Button>
        {avatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={uploading || deleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
