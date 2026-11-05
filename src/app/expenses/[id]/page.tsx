"use client";
import { useRecordId } from "@/lib/useRecordId";

import { useEffect, useState, use } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, Edit, DollarSign, Calendar, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ExpenseDetailPage() {
  const id = useRecordId();
  const [expense, setExpense] = useState<any>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const sRes = await fetch("/api/auth/session");
        if (sRes.ok) {
          const sData = await sRes.json();
          setSessionUser(sData.user);
        }

        const eRes = await fetch(`/api/expenses/${id}`);
        if (eRes.ok) {
          setExpense(await eRes.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  if (loading) {
    return (
      <>
        <Header title="Expense Details" />
        <div className="page-pad">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <Card className="space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </Card>
        </div>
      </>
    );
  }

  if (!expense) {
    return (
      <>
        <Header title="Expense Not Found" />
        <div className="p-6 text-center text-slate-500">
          Expense record not found.
        </div>
      </>
    );
  }

  const canEdit = sessionUser?.role === "CEO" || sessionUser?.role === "MANAGER";

  return (
    <>
      <Header title="Expense Record" />
      <div className="page-pad">
        <div className="flex items-center justify-between mb-6">
          <Link href="/expenses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to Expenses
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/expenses/view?id=${id}/edit`}>
              <Button variant="primary" size="sm">
                <Edit className="w-4 h-4" /> Edit Expense
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              title={`${expense.category} Expense`}
              subtitle={`Vehicle: ${expense.vehicle?.name} (${expense.vehicle?.code})`}
              action={
                <Badge variant="success">{expense.category}</Badge>
              }
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm py-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Amount</span>
                  <span className="font-bold text-slate-900 text-lg">{formatCurrency(expense.amount)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Expense Date</span>
                  <span className="font-semibold text-slate-800">{formatDate(expense.date)}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Category</span>
                <span className="font-semibold text-slate-800">{expense.category}</span>
              </div>
            </div>

            {expense.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Description</span>
                </div>
                <p className="text-sm text-slate-700">{expense.description}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 block">Recorded</span>
              <span className="font-semibold text-slate-800 text-sm">{formatDate(expense.createdAt)}</span>
            </div>
          </Card>

          <Card className="bg-[#0F6B4B] text-white">
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-80">Vehicle Information</h3>
            <div className="mt-3">
              <Link href={`/vehicles/view?id=${expense.vehicle?.id}`} className="block p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <p className="font-bold text-lg">{expense.vehicle?.code}</p>
                <p className="text-xs opacity-90">{expense.vehicle?.name}</p>
                <p className="text-xs opacity-75">{expense.vehicle?.registrationNumber}</p>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
