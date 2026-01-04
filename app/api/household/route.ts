import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get user's household(s)
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const memberships = await prisma.householdMember.findMany({
      where: { userId: session.user.id },
      include: {
        household: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            invites: {
              where: { acceptedAt: null },
              select: { id: true, email: true, expiresAt: true },
            },
          },
        },
      },
    });

    const households = memberships.map((m) => ({
      ...m.household,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return NextResponse.json(households);
  } catch (err) {
    console.error("Failed to fetch households:", err);
    return NextResponse.json(
      { error: "Failed to fetch households" },
      { status: 500 }
    );
  }
}

// Create a new household
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Household name is required" },
        { status: 400 }
      );
    }

    // Create household with user as owner
    const household = await prisma.household.create({
      data: {
        name: name.trim(),
        members: {
          create: {
            userId: session.user.id,
            role: "owner",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(household);
  } catch (err) {
    console.error("Failed to create household:", err);
    return NextResponse.json(
      { error: "Failed to create household" },
      { status: 500 }
    );
  }
}

// Update household
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, name } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Household ID is required" },
        { status: 400 }
      );
    }

    // Check if user is owner or admin
    const membership = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: session.user.id,
          householdId: id,
        },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const household = await prisma.household.update({
      where: { id },
      data: { name: name?.trim() },
    });

    return NextResponse.json(household);
  } catch (err) {
    console.error("Failed to update household:", err);
    return NextResponse.json(
      { error: "Failed to update household" },
      { status: 500 }
    );
  }
}

// Delete household (owner only)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Household ID is required" },
        { status: 400 }
      );
    }

    // Check if user is owner
    const membership = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: session.user.id,
          householdId: id,
        },
      },
    });

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can delete a household" },
        { status: 403 }
      );
    }

    await prisma.household.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete household:", err);
    return NextResponse.json(
      { error: "Failed to delete household" },
      { status: 500 }
    );
  }
}
