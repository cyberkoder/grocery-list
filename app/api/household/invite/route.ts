import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create an invite
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { householdId, email } = await req.json();

    if (!householdId || !email?.trim()) {
      return NextResponse.json(
        { error: "Household ID and email are required" },
        { status: 400 }
      );
    }

    // Check if user is owner or admin
    const membership = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: session.user.id,
          householdId,
        },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      const existingMember = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: {
            userId: existingUser.id,
            householdId,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this household" },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invite
    const existingInvite = await prisma.householdInvite.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        householdId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invite has already been sent to this email" },
        { status: 400 }
      );
    }

    // Create invite (expires in 7 days)
    const invite = await prisma.householdInvite.create({
      data: {
        email: email.trim().toLowerCase(),
        householdId,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        household: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });

    // In production, you'd send an email here
    // For now, return the invite token for manual sharing
    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      token: invite.token,
      expiresAt: invite.expiresAt,
      householdName: invite.household.name,
      inviteUrl: `/invite/${invite.token}`,
    });
  } catch (err) {
    console.error("Failed to create invite:", err);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

// Accept an invite
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required" },
        { status: 400 }
      );
    }

    // Find the invite
    const invite = await prisma.householdInvite.findUnique({
      where: { token },
      include: { household: true },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite" },
        { status: 404 }
      );
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: "Invite has already been used" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: session.user.id,
          householdId: invite.householdId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this household" },
        { status: 400 }
      );
    }

    // Accept invite and add user to household
    await prisma.$transaction([
      prisma.householdInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
      prisma.householdMember.create({
        data: {
          userId: session.user.id,
          householdId: invite.householdId,
          role: "member",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      householdId: invite.householdId,
      householdName: invite.household.name,
    });
  } catch (err) {
    console.error("Failed to accept invite:", err);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}

// Cancel/delete an invite
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
        { error: "Invite ID is required" },
        { status: 400 }
      );
    }

    const invite = await prisma.householdInvite.findUnique({
      where: { id },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or admin of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: session.user.id,
          householdId: invite.householdId,
        },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.householdInvite.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete invite:", err);
    return NextResponse.json(
      { error: "Failed to delete invite" },
      { status: 500 }
    );
  }
}
