"use client";

import { useState, useRef } from "react";
import { X, Camera, Loader2, Receipt, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ParsedItem {
  name: string;
  quantity: number;
  price?: number;
}

interface ReceiptScannerProps {
  open: boolean;
  onClose: () => void;
  onItemsFound: (items: ParsedItem[]) => void;
}

export function ReceiptScanner({ open, onClose, onItemsFound }: ReceiptScannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process with AI
    await processReceipt(file);
  }

  async function processReceipt(file: File) {
    setLoading(true);
    setError(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // Remove data:image/... prefix
        };
        reader.readAsDataURL(file);
      });

      // Send to AI for parsing
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (!res.ok) {
        throw new Error("Failed to process receipt");
      }

      const data = await res.json();

      if (data.items && data.items.length > 0) {
        onItemsFound(data.items);
        onClose();
      } else {
        setError("No items found on receipt. Try a clearer photo.");
      }
    } catch (err) {
      console.error("Receipt processing error:", err);
      setError("Failed to process receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setPreview(null);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Scan Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
              <p>{error}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setError(null);
                  setPreview(null);
                  fileInputRef.current?.click();
                }}
              >
                Try Again
              </Button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              {preview && (
                <img
                  src={preview}
                  alt="Receipt"
                  className="w-32 h-32 object-cover rounded-lg mb-4 opacity-50"
                />
              )}
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">Analyzing receipt with AI...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
          ) : preview ? (
            <div className="flex flex-col items-center">
              <img
                src={preview}
                alt="Receipt preview"
                className="max-h-64 rounded-lg mb-4"
              />
              <Button
                onClick={() => {
                  setPreview(null);
                  fileInputRef.current?.click();
                }}
                variant="outline"
              >
                Choose Different Photo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full h-24 flex flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>Take Photo of Receipt</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload from Gallery
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                AI will extract items from your receipt and add them to your purchase history
              </p>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={handleClose}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
