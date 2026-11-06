import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Plus, DollarSign } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { VehicleSpendAnalysis } from "@/components/analytics/VehicleSpendAnalysis";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    include: {
      vehicle: true,
    },
    orderBy: { date: "desc" },
  });

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <>
      <Header title="Expense Management" />
      <div className="page-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Fleet Operating Expenses</h3>
            <p className="text-xs text-slate-500">Track insurance, licensing, registration, repairs, and miscellaneous costs.</p>
          </div>
          <div className="flex items-center gap-2">
            <VehicleSpendAnalysis buttonLabel="Vehicle Spend Analysis" />
            <Link href="/expenses/new" data-tour="expenses-add-btn">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4" /> Add Expense Record
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Logged Operating Expenses</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(total)}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-[#0F6B4B] rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                      No expense records found.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 cursor-pointer">
                      <td className="py-3 px-4 text-xs text-slate-600">{formatDate(exp.date)}</td>
                      <td className="py-3 px-4">
                        <Link href={`/expenses/view?id=${exp.id}`} className="font-semibold text-slate-800 hover:text-[#0F6B4B]">
                          {exp.vehicle.name} <span className="font-mono text-xs text-slate-500">({exp.vehicle.code})</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#0F6B4B]">{exp.category}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs">{exp.description || "N/A"}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(exp.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
