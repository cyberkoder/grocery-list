import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHouseholdId } from "@/lib/household";

// Analyze purchase patterns and update recurring status
async function analyzeRecurringPatterns() {
  const itemHistories = await prisma.itemHistory.findMany({
    where: {
      addCount: { gte: 3 },
    },
    include: {
      purchases: {
        orderBy: { purchasedAt: "asc" },
        select: { purchasedAt: true },
      },
    },
  });

  for (const item of itemHistories) {
    if (item.purchases.length < 3) continue;

    // Calculate intervals between purchases
    const intervals: number[] = [];
    for (let i = 1; i < item.purchases.length; i++) {
      const prevDate = item.purchases[i - 1].purchasedAt;
      const currDate = item.purchases[i].purchasedAt;
      const daysDiff = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      intervals.push(daysDiff);
    }

    if (intervals.length === 0) continue;

    // Calculate average interval
    const avgInterval = Math.round(
      intervals.reduce((a, b) => a + b, 0) / intervals.length
    );

    // Mark as recurring if average interval is less than 30 days
    const isRecurring = avgInterval > 0 && avgInterval <= 30;

    await prisma.itemHistory.update({
      where: { id: item.id },
      data: {
        purchaseIntervalDays: avgInterval,
        isRecurring,
      },
    });
  }
}

// Common product types that should come first with flavor in parentheses
// Multi-word types should come first (longer matches first)
const PRODUCT_TYPES = [
  // Multi-word (check these first)
  "toilet paper", "paper towels", "ice cream", "cream cheese", "sour cream",
  "orange juice", "apple juice", "greek yogurt", "coffee creamer", "lunch meat",
  "hot dogs", "ground beef", "chicken breast", "peanut butter", "jelly",
  // Single-word
  "chips", "crackers", "cookies", "cereal", "yogurt", "bread", "bagels",
  "muffins", "donuts", "pizza", "soup", "sauce", "juice", "soda", "water",
  "milk", "cheese", "butter", "eggs", "bacon", "sausage", "ham", "turkey"
];

// Title case a string (handles multi-word)
function toTitleCase(str: string): string {
  return str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

// Normalize item name: format nicely
function normalizeName(name: string): string {
  let normalized = name
    .trim()
    .toLowerCase()
    // Replace "and" with "&"
    .replace(/\s+and\s+/gi, " & ");

  // Title case each word
  normalized = normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Check if name ends with a product type (e.g., "Cheddar & Sour Cream Chips")
  // and reformat to "Chips (Cheddar & Sour Cream)"
  for (const productType of PRODUCT_TYPES) {
    const titleType = toTitleCase(productType);
    // Escape special regex chars and handle multi-word types
    const escapedType = titleType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^(.+)\\s+${escapedType}$`, "i");
    const match = normalized.match(regex);
    if (match && match[1]) {
      const flavor = match[1].trim();
      // Don't reformat if flavor is just a size/quantity word
      if (!["Large", "Small", "Mini", "Family", "Single"].includes(flavor)) {
        normalized = `${titleType} (${flavor})`;
        break;
      }
    }
  }

  return normalized;
}

// Category names to exclude from history
const EXCLUDED_NAMES = [
  "produce", "dairy", "meat & seafood", "frozen", "pantry",
  "beverages", "snacks", "household", "personal care", "baby", "pet", "other"
];

// Check if name is valid for history
function isValidForHistory(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  return normalized.length >= 2 && !EXCLUDED_NAMES.includes(normalized);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, quantity, unit, note, categoryId, storeId } = await req.json();

    if (!name || !categoryId || !storeId) {
      return NextResponse.json(
        { error: "Name, category, and store are required" },
        { status: 400 }
      );
    }

    // Format the name nicely
    const formattedName = normalizeName(name);

    // Get user's household (if any)
    const householdId = await getHouseholdId(session.user.id);

    const item = await prisma.item.create({
      data: {
        name: formattedName,
        quantity: quantity || 1,
        unit: unit || null,
        note: note || null,
        categoryId,
        storeId,
        addedById: session.user.id,
        householdId,
      },
      include: {
        addedBy: {
          select: { name: true },
        },
        category: true,
        store: true,
      },
    });

    // Track in ItemHistory for suggestions (if valid name)
    if (isValidForHistory(formattedName)) {
      try {
        await prisma.itemHistory.upsert({
          where: { name: formattedName },
          update: {
            addCount: { increment: 1 },
            lastAddedAt: new Date(),
            categoryId,
            storeId,
            defaultQuantity: quantity || 1,
            defaultUnit: unit || undefined,
          },
          create: {
            name: formattedName,
            categoryId,
            storeId,
            defaultQuantity: quantity || 1,
            defaultUnit: unit || null,
            addCount: 1,
            lastAddedAt: new Date(),
          },
        });
      } catch (historyError) {
        // Don't fail the request if history tracking fails
        console.error("Error tracking item history:", historyError);
      }
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, checked, name, quantity, unit, note, categoryId, storeId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof checked === "boolean") updateData.checked = checked;
    if (name) updateData.name = normalizeName(name);
    if (quantity) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (note !== undefined) updateData.note = note;
    if (categoryId) updateData.categoryId = categoryId;
    if (storeId) updateData.storeId = storeId;

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        addedBy: {
          select: { name: true },
        },
        category: true,
        store: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearChecked = searchParams.get("clearChecked");

    if (clearChecked === "true") {
      // Get all checked items before deleting
      const checkedItems = await prisma.item.findMany({
        where: { checked: true },
        include: {
          category: { select: { name: true } },
          store: { select: { name: true } },
        },
      });

      if (checkedItems.length > 0) {
        // Create a shopping trip record with all purchases
        await prisma.$transaction(async (tx) => {
          // Create the shopping trip
          const trip = await tx.shoppingTrip.create({
            data: {
              userId: session.user.id,
              itemCount: checkedItems.length,
            },
          });

          // Create purchase records for each item
          await tx.purchaseRecord.createMany({
            data: checkedItems.map((item) => ({
              tripId: trip.id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              categoryName: item.category.name,
              storeName: item.store.name,
            })),
          });

          // Delete the checked items
          await tx.item.deleteMany({
            where: { checked: true },
          });
        });

        // Analyze recurring patterns in the background
        analyzeRecurringPatterns().catch(console.error);
      }

      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
