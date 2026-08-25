import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "EDIT_VEHICLE");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = formData.get("caption") as string | null;
    const isPrimary = formData.get("isPrimary") === "true";

    if (!file) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
    }

    const { url, publicId } = await uploadToCloudinary(file, `vehico/vehicles/${vehicle.code}`);

    if (isPrimary) {
      await prisma.vehicleImage.updateMany({
        where: { vehicleId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.vehicleImage.create({
      data: {
        vehicleId: id,
        url,
        publicId,
        caption: caption || file.name,
        isPrimary,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "ADD_VEHICLE_IMAGE",
        entity: "VehicleImage",
        entityId: image.id,
        details: `Uploaded image to vehicle ${vehicle.code} by ${gate.session.name}`,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "EDIT_VEHICLE");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await req.json();
    const { imageId, isPrimary } = body;

    if (!imageId) {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }

    if (isPrimary) {
      await prisma.vehicleImage.updateMany({
        where: { vehicleId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.vehicleImage.update({
      where: { id: imageId },
      data: { isPrimary: isPrimary ?? false },
    });

    return NextResponse.json(image);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "EDIT_VEHICLE");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await req.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }

    const image = await prisma.vehicleImage.findUnique({ where: { id: imageId } });
    if (image?.publicId) {
      await deleteFromCloudinary(image.publicId);
    }

    await prisma.vehicleImage.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
