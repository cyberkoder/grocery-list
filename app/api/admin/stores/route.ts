import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const stores = await prisma.store.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { items: true, itemHistory: true },
        },
      },
    });

    return NextResponse.json(stores);
  } catch (err) {
    console.error("Failed to fetch stores:", err);
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { name, icon } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get max order
    const maxOrder = await prisma.store.aggregate({
      _max: { order: true },
    });

    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        icon: icon || null,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return NextResponse.json(store);
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Store with this name already exists" },
        { status: 400 }
      );
    }
    console.error("Failed to create store:", err);
    return NextResponse.json(
      { error: "Failed to create store" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id, name, icon } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(icon !== undefined && { icon }),
      },
    });

    return NextResponse.json(store);
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Store with this name already exists" },
        { status: 400 }
      );
    }
    console.error("Failed to update store:", err);
    return NextResponse.json(
      { error: "Failed to update store" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Check if store has items
    const itemCount = await prisma.item.count({
      where: { storeId: id },
    });

    if (itemCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete store with ${itemCount} items` },
        { status: 400 }
      );
    }

    await prisma.store.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete store:", err);
    return NextResponse.json(
      { error: "Failed to delete store" },
      { status: 500 }
    );
  }
}
