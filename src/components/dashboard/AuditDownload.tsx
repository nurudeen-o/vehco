"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";

export function AuditDownload() {
  const [canDownload, setCanDownload] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const role = data?.user?.role;
        if (role && hasPermission(role, "DOWNLOAD_AUDIT_LOGS")) {
          setCanDownload(true);
        }
      })
      .catch(() => setCanDownload(false));
  }, []);

  if (!canDownload) return null;

  const download = (format: string) => {
    const url = `/api/audit-logs?format=${format}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `faco_audit_logs.${format === "excel" ? "xlsx" : format}`;
    link.target = "_self";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={() => download("pdf")}>
        <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => download("excel")}>
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
      </Button>
      <Button variant="ghost" size="sm" onClick={() => download("csv")}>
        <Download className="w-3.5 h-3.5 text-slate-600" /> CSV
      </Button>
    </div>
  );
}
