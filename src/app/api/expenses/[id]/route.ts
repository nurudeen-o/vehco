import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "VIEW_EXPENSES");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { vehicle: true },
    });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "EDIT_EXPENSE");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const data: Record<string, any> = {};

    if (body.vehicleId !== undefined) data.vehicleId = body.vehicleId;
    if (body.category !== undefined) data.category = body.category;
    if (body.amount !== undefined) data.amount = parseFloat(body.amount) || 0;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.date !== undefined) data.date = new Date(body.date);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: { vehicle: true },
    });

    const changedFields = Object.keys(data).join(", ");
    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "UPDATE_EXPENSE",
        entity: "Expense",
        entityId: expense.id,
        details: `Updated ${expense.category} expense of ${expense.amount} fields [${changedFields}] by ${gate.session.name}`,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}
