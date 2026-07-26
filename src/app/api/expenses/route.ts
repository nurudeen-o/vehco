import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    await prisma.auditLog.create({
      data: {
        userId: session?.id || null,
        action: "RECORD_EXPENSE",
        entity: "Expense",
        entityId: expense.id,
        details: `Recorded ${expense.category} expense of ₦${expense.amount.toLocaleString()} by ${session?.name || "System"}`,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create expense record" }, { status: 500 });
  }
}
