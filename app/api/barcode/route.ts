import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { success: false, error: "Barcode code is required" },
      { status: 400 }
    );
  }

  try {
    // Try Open Food Facts API first
    const offResponse = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
      { headers: { "User-Agent": "GroceryListApp/1.0" } }
    );

    if (offResponse.ok) {
      const data = await offResponse.json();

      if (data.status === 1 && data.product) {
        const product = data.product;

        // Get the best product name available
        const name = product.product_name_en ||
                     product.product_name ||
                     product.generic_name_en ||
                     product.generic_name ||
                     product.brands ||
                     null;

        if (name) {
          return NextResponse.json({
            success: true,
            product: {
              name: formatProductName(name, product.brands),
              barcode: code,
              brand: product.brands || null,
              category: product.categories_tags?.[0]?.replace("en:", "") || null,
              imageUrl: product.image_small_url || product.image_url || null,
            },
          });
        }
      }
    }

    // Product not found
    return NextResponse.json({
      success: false,
      error: "Product not found",
    });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to lookup barcode" },
      { status: 500 }
    );
  }
}

function formatProductName(name: string, brand?: string): string {
  // Clean up the product name
  let cleanName = name.trim();

  // If the name doesn't include the brand and we have one, append it
  if (brand && !cleanName.toLowerCase().includes(brand.toLowerCase())) {
    // Format as "Product Name (Brand)"
    cleanName = `${cleanName} (${brand})`;
  }

  // Title case the name
  return cleanName
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
