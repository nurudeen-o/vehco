import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "DOWNLOAD_AUDIT_LOGS")) {
    return NextResponse.json(
      { error: "Forbidden. Only CEO and Manager can download audit logs." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const columns = ["Timestamp", "User", "Role", "Action", "Entity", "Entity ID", "Details"];
  const rows = logs.map((log) => [
    formatDate(log.createdAt) + " " + new Date(log.createdAt).toLocaleTimeString("en-NG"),
    log.user?.name || "System",
    log.user?.role || "N/A",
    log.action,
    log.entity,
    log.entityId || "N/A",
    log.details || "",
  ]);

  if (format === "json") {
    return NextResponse.json({
      count: logs.length,
      logs: logs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
        user: log.user
          ? { id: log.user.id, name: log.user.name, role: log.user.role, email: log.user.email }
          : null,
      })),
    });
  }

  if (format === "csv") {
    const csv = [
      columns.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vehico_audit_logs_${Date.now()}.csv"`,
      },
    });
  }

  if (format === "excel") {
    const ws = XLSX.utils.aoa_to_sheet([columns, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="vehico_audit_logs_${Date.now()}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(15, 107, 75);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setFillColor(244, 180, 0);
    doc.rect(0, 26, pageWidth, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("vehiCO", 14, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Audit & System Activity Log", 14, 18);
    doc.setFontSize(9);
    doc.text(`Exported by ${session.name} (${session.role})`, pageWidth - 14, 12, {
      align: "right",
    });
    doc.text(formatDate(new Date()), pageWidth - 14, 18, { align: "right" });

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("System Audit Trail", 14, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${logs.length} records  ·  Confidential  ·  CEO / Manager access only`, 14, 41);

    autoTable(doc, {
      head: [columns],
      body: rows.length > 0 ? rows : [["No audit records found.", "", "", "", "", "", ""]],
      startY: 46,
      margin: { left: 14, right: 14, bottom: 16 },
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [15, 107, 75],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `vehiCO Audit Export  |  Page ${i} of ${totalPages}`,
        14,
        pageHeight - 8
      );
    }

    const pdfBuf = doc.output("arraybuffer");
    return new NextResponse(pdfBuf as unknown as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vehico_audit_logs_${Date.now()}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format. Use csv, excel, pdf, or json." }, { status: 400 });
}
