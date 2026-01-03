"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (product: { name: string; barcode: string }) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !scanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open]);

  async function startScanner() {
    if (!containerRef.current) return;

    setError(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        async (decodedText) => {
          // Barcode scanned successfully
          await handleBarcodeScan(decodedText);
        },
        () => {
          // QR code scan error - ignore, keep scanning
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Could not access camera. Please allow camera permissions.");
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore errors when stopping
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function handleBarcodeScan(barcode: string) {
    // Stop scanning while we look up the product
    await stopScanner();
    setLoading(true);
    setError(null);

    try {
      // Look up product info from Open Food Facts API
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (data.success && data.product) {
        onScan({ name: data.product.name, barcode });
        onClose();
      } else {
        // Product not found, just use barcode as name
        onScan({ name: `Product ${barcode}`, barcode });
        onClose();
      }
    } catch (err) {
      console.error("Barcode lookup error:", err);
      // Use barcode as fallback
      onScan({ name: `Product ${barcode}`, barcode });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    stopScanner();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          {error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
              <p>{error}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => startScanner()}
              >
                Try Again
              </Button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">Looking up product...</p>
            </div>
          ) : (
            <div className="relative">
              <div
                id="barcode-reader"
                ref={containerRef}
                className="w-full rounded-lg overflow-hidden bg-black"
                style={{ minHeight: "300px" }}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-24 border-2 border-primary rounded-lg opacity-50" />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-3">
                Point your camera at a product barcode
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
