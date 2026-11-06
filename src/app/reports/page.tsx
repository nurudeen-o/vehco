"use client";

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

export default function ReportsPage() {
  const reportTypes = [
    { title: "Vehicle Utilization & Master Report", desc: "Complete fleet inventory, statuses, assigned drivers and branches.", type: "Vehicle" },
    { title: "Driver Assignment & Performance Report", desc: "Driver license status, emergency contacts, and assigned vehicles.", type: "Driver" },
    { title: "Maintenance & Servicing Expense Report", desc: "Detailed breakdown of repair costs, labour, parts, and vendors.", type: "Maintenance" },
    { title: "Executive Operating Cost Summary", desc: "Lifetime vehicle operating costs categorized by type and branch.", type: "Executive" },
  ];

  const handleDownload = (type: string, format: string) => {
    const url = `/api/reports/${type.toLowerCase()}?format=${format}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `faco_${type.toLowerCase()}_report.${format === "excel" ? "xlsx" : format}`;
    link.target = "_self";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Header title="Reports & Analytics Exports" />
      <div className="page-pad">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Enterprise Reports</h3>
          <p className="text-xs text-slate-500">Generate executive summaries, operational exports, and compliance documentation.</p>
        </div>

        <div data-tour="reports-criteria" className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {reportTypes.map((report) => (
            <Card key={report.title} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F6B4B] bg-emerald-50 px-2 py-0.5 rounded">
                    {report.type}
                  </span>
                  <h4 className="font-bold text-slate-900 text-base mt-2">{report.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{report.desc}</p>
                </div>
              </div>

              <div
                data-tour={report.type === "VEHICLE_SPEND" ? "reports-export-btns" : undefined}
                className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100"
              >
                <Button variant="outline" size="sm" onClick={() => handleDownload(report.type, 'pdf')}>
                  <FileText className="w-3.5 h-3.5 text-rose-600" /> Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload(report.type, 'excel')}>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(report.type, 'csv')}>
                  <Download className="w-3.5 h-3.5 text-slate-600" /> CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
