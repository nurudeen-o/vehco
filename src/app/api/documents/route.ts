import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";
import { uploadFileToCloudinary } from "@/lib/cloudinary";

export async function GET() {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "VIEW_DOCUMENTS");
    if (!gate.ok) return gate.response;

    const documents = await prisma.document.findMany({
      where: { deletedAt: null },
      include: {
        vehicle: { select: { code: true, name: true } },
        driver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "VIEW_DOCUMENTS");
    if (!gate.ok) return gate.response;

    const formData = await req.formData();
    const title = String(formData.get("title") || "").trim();
    const type = String(formData.get("type") || "").trim();
    const file = formData.get("file");
    const expiryDate = formData.get("expiryDate");
    const vehicleId = formData.get("vehicleId");
    const driverId = formData.get("driverId");

    if (!title || !type || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Title, type and file are required" },
        { status: 400 }
      );
    }

    const uploaded = await uploadFileToCloudinary(file, "faco/documents");

    const document = await prisma.document.create({
      data: {
        title,
        type,
        fileUrl: uploaded.url,
        expiryDate: expiryDate ? new Date(String(expiryDate)) : null,
        vehicleId: vehicleId ? String(vehicleId) : null,
        driverId: driverId ? String(driverId) : null,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: gate.session.id,
          action: "CREATE_DOCUMENT",
          entity: "Document",
          entityId: document.id,
          details: `${gate.session.name} uploaded document ${title}`,
        },
      })
      .catch(() => {});

    return NextResponse.json(document, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
