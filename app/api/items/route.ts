import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, quantity, unit, note, categoryId } = await req.json();

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: {
        name,
        quantity: quantity || 1,
        unit: unit || null,
        note: note || null,
        categoryId,
        addedById: session.user.id,
      },
      include: {
        addedBy: {
          select: { name: true },
        },
        category: true,
      },
    });

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
    const { id, checked, name, quantity, unit, note, categoryId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof checked === "boolean") updateData.checked = checked;
    if (name) updateData.name = name;
    if (quantity) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (note !== undefined) updateData.note = note;
    if (categoryId) updateData.categoryId = categoryId;

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        addedBy: {
          select: { name: true },
        },
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

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearChecked = searchParams.get("clearChecked");

    if (clearChecked === "true") {
      await prisma.item.deleteMany({
        where: { checked: true },
      });
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
