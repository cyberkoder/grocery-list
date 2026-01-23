import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size: 2MB" },
      { status: 400 }
    );
  }

  // Get file extension
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${session.user.id}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  // Delete old avatar if exists (might have different extension)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  if (user?.avatarUrl) {
    const oldFilename = user.avatarUrl.split("/").pop();
    if (oldFilename && oldFilename !== filename) {
      const oldPath = path.join(UPLOAD_DIR, oldFilename);
      try {
        if (existsSync(oldPath)) {
          await unlink(oldPath);
        }
      } catch {
        // Ignore errors deleting old file
      }
    }
  }

  // Write new file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);

  // Update user with new avatar URL
  const avatarUrl = `/uploads/avatars/${filename}`;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  if (user?.avatarUrl) {
    const filename = user.avatarUrl.split("/").pop();
    if (filename) {
      const filepath = path.join(UPLOAD_DIR, filename);
      try {
        if (existsSync(filepath)) {
          await unlink(filepath);
        }
      } catch {
        // Ignore errors deleting file
      }
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ success: true });
}
