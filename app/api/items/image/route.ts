import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Search Open Food Facts for product image by name
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const historyId = searchParams.get("historyId");

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    // First check if we have a cached image in ItemHistory
    if (historyId) {
      const history = await prisma.itemHistory.findUnique({
        where: { id: historyId },
        select: { imageUrl: true },
      });
      if (history?.imageUrl) {
        return NextResponse.json({ imageUrl: history.imageUrl, cached: true });
      }
    }

    // Search Open Food Facts
    const searchQuery = encodeURIComponent(name.toLowerCase());
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${searchQuery}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,image_front_small_url,image_front_url`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      return NextResponse.json({ imageUrl: null });
    }

    const data = await response.json();
    const products = data.products || [];

    // Find best match
    let imageUrl: string | null = null;
    const normalizedName = name.toLowerCase().trim();

    for (const product of products) {
      const productName = (product.product_name || "").toLowerCase();
      // Check if product name contains our search term
      if (productName.includes(normalizedName) || normalizedName.includes(productName)) {
        imageUrl = product.image_front_small_url || product.image_front_url || null;
        if (imageUrl) break;
      }
    }

    // If no name match, just use first result with an image
    if (!imageUrl && products.length > 0) {
      for (const product of products) {
        imageUrl = product.image_front_small_url || product.image_front_url || null;
        if (imageUrl) break;
      }
    }

    // Cache the result in ItemHistory if we have an ID
    if (imageUrl && historyId) {
      await prisma.itemHistory.update({
        where: { id: historyId },
        data: { imageUrl },
      }).catch(() => {}); // Ignore errors
    }

    return NextResponse.json({ imageUrl, cached: false });
  } catch (err) {
    console.error("Failed to fetch product image:", err);
    return NextResponse.json({ imageUrl: null });
  }
}
