import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public (unauthenticated) vehicle verification API.
 * Usage: GET /api/public/vehicles/verify/{vehicleCode}
 *
 * Returns public-facing vehicle details for marketing site integration.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { code },
      include: {
        assignedDriver: {
          select: {
            firstName: true,
            lastName: true,
            licenseNumber: true,
            employmentStatus: true,
          },
        },
        branch: {
          select: {
            name: true,
            location: true,
          },
        },
        images: {
          where: { isPrimary: true },
          select: {
            url: true,
            caption: true,
          },
          take: 1,
        },
      },
    });

    if (!vehicle || vehicle.deletedAt) {
      return NextResponse.json(
        { error: "Vehicle not found", verified: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verified: true,
      vehicle: {
        code: vehicle.code,
        name: vehicle.name,
        registrationNumber: vehicle.registrationNumber,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
        colour: vehicle.colour,
        fuelType: vehicle.fuelType,
        status: vehicle.status,
        vin: vehicle.vin,
        engineNumber: vehicle.engineNumber,
        branch: vehicle.branch,
        assignedDriver: vehicle.assignedDriver,
        primaryImage: vehicle.images[0] || null,
      },
    },{
    headers: {
      "Access-Control-Allow-Origin": "*",
    }}
  );
  } catch (error) {
    return NextResponse.json(
      { error: "Verification failed", verified: false },
      { status: 500 }
    );
  }
}
