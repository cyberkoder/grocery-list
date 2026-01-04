import { prisma } from "@/lib/prisma";

// Get the user's active household (first one they belong to)
export async function getUserHousehold(userId: string) {
  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: {
      household: true,
    },
    orderBy: { joinedAt: "asc" }, // Oldest first (usually their own)
  });

  return membership?.household || null;
}

// Get household ID for queries (null if no household = personal items only)
export async function getHouseholdId(userId: string): Promise<string | null> {
  const household = await getUserHousehold(userId);
  return household?.id || null;
}

// Check if user has access to a household
export async function hasHouseholdAccess(
  userId: string,
  householdId: string
): Promise<boolean> {
  const membership = await prisma.householdMember.findUnique({
    where: {
      userId_householdId: { userId, householdId },
    },
  });
  return !!membership;
}

// Get user's role in household
export async function getHouseholdRole(
  userId: string,
  householdId: string
): Promise<string | null> {
  const membership = await prisma.householdMember.findUnique({
    where: {
      userId_householdId: { userId, householdId },
    },
  });
  return membership?.role || null;
}
