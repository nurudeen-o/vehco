import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expenses = await prisma.expense.findMany({
      include: { vehicle: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "RECORD_EXPENSE");
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const expense = await prisma.expense.create({
      data: {
        vehicleId: body.vehicleId,
        category: body.category,
        amount: parseFloat(body.amount),
        description: body.description || null,
        date: new Date(body.date),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "RECORD_EXPENSE",
        entity: "Expense",
        entityId: expense.id,
        details: `Recorded ${expense.category} expense of ₦${expense.amount.toLocaleString()} by ${gate.session.name}`,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create expense record" }, { status: 500 });
  }
}
