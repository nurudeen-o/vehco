import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";

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

    const body = await req.json();
    if (!body.url) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    // If this is marked as primary, unset other primaries
    if (body.isPrimary) {
      await prisma.vehicleImage.updateMany({
        where: { vehicleId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.vehicleImage.create({
      data: {
        vehicleId: id,
        url: body.url,
        caption: body.caption || null,
        isPrimary: body.isPrimary || false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "ADD_VEHICLE_IMAGE",
        entity: "VehicleImage",
        entityId: image.id,
        details: `Added image to vehicle ${vehicle.code} by ${gate.session.name}`,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
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

    // If setting as primary, unset others first
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

    await prisma.vehicleImage.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
