import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = {
  primary: [15, 107, 75] as [number, number, number],
  accent: [244, 180, 0] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

function drawPdfHeader(doc: jsPDF, title: string, meta: string, pageWidth: number) {
  // Top brand bar
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent strip
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  // Logo badge
  doc.setFillColor(...BRAND.white);
  doc.roundedRect(12, 7, 14, 14, 2, 2, 'F');
  doc.setTextColor(...BRAND.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('vC', 19, 16, { align: 'center' });

  // Brand name
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(14);
  doc.text('vehiCO', 30, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 220, 210);
  doc.text('Enterprise Fleet Management', 30, 19);

  // Report title on the right of header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.white);
  doc.text(title, pageWidth - 14, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 220, 210);
  doc.text(meta, pageWidth - 14, 19, { align: 'right' });
}

function drawPdfFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number, totalPages: number) {
  const y = pageHeight - 12;
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(14, y - 4, pageWidth - 14, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text('vehiCO Fleet Intelligence  |  Confidential', 14, y);
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 14, y, { align: 'right' });
}

function drawSummaryCards(
  doc: jsPDF,
  cards: { label: string; value: string }[],
  startY: number,
  pageWidth: number
): number {
  if (cards.length === 0) return startY;

  const marginX = 14;
  const gap = 6;
  const usable = pageWidth - marginX * 2;
  const cardW = (usable - gap * (cards.length - 1)) / cards.length;
  const cardH = 18;

  cards.forEach((card, i) => {
    const x = marginX + i * (cardW + gap);
    doc.setFillColor(...BRAND.light);
    doc.setDrawColor(...BRAND.border);
    doc.roundedRect(x, startY, cardW, cardH, 2, 2, 'FD');

    // Left accent bar
    doc.setFillColor(...BRAND.primary);
    doc.rect(x, startY, 1.5, cardH, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(card.label.toUpperCase(), x + 5, startY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.dark);
    doc.text(card.value, x + 5, startY + 13.5);
  });

  return startY + cardH + 8;
}

const formatNaira = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function buildSummary(
  reportType: string,
  data: any[],
  raw?: { totalFuel?: number; totalMaint?: number; totalExp?: number; totalAll?: number }
): { label: string; value: string }[] {
  const count = data.length.toString();

  switch (reportType) {
    case 'vehicle':
      return [
        { label: 'Total Vehicles', value: count },
        { label: 'Report Scope', value: 'Full Fleet' },
        { label: 'Format', value: 'Master List' },
      ];
    case 'driver':
      return [
        { label: 'Total Drivers', value: count },
        { label: 'Report Scope', value: 'Personnel' },
        { label: 'Format', value: 'Roster' },
      ];
    case 'maintenance':
      return [
        { label: 'Records', value: count },
        { label: 'Report Scope', value: 'Service Log' },
        { label: 'Currency', value: 'NGN (₦)' },
      ];
    case 'fuel':
      return [
        { label: 'Refuel Logs', value: count },
        { label: 'Report Scope', value: 'Fuel Ops' },
        { label: 'Currency', value: 'NGN (₦)' },
      ];
    case 'executive':
      return [
        { label: 'Vehicles', value: count },
        { label: 'Total Operating Cost', value: raw?.totalAll != null ? formatNaira(raw.totalAll) : 'N/A' },
        { label: 'Currency', value: 'NGN (₦)' },
      ];
    default:
      return [{ label: 'Rows', value: count }];
  }
}

export async function GET(request: Request, context: any) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const { type } = await context.params;
  const reportType = type.toLowerCase();

  let data: any[] = [];
  let columns: string[] = [];
  let title = '';
  let execTotals = { totalFuel: 0, totalMaint: 0, totalExp: 0, totalAll: 0 };

  switch (reportType) {
    case 'vehicle':
      title = 'Vehicle Master Report';
      columns = ['Code', 'Name', 'Registration', 'Manufacturer', 'Model', 'Year', 'Fuel Type', 'Status', 'Assigned Driver'];
      const vehicles = await prisma.vehicle.findMany({ include: { assignedDriver: true } });
      data = vehicles.map(v => [
        v.code, v.name, v.registrationNumber, v.manufacturer, v.model, v.year.toString(), v.fuelType, v.status,
        v.assignedDriver ? `${v.assignedDriver.firstName} ${v.assignedDriver.lastName}` : 'Unassigned'
      ]);
      break;

    case 'driver':
      title = 'Driver Personnel Report';
      columns = ['First Name', 'Last Name', 'Email', 'Phone', 'License Number', 'License Expiry', 'Employment Status'];
      const drivers = await prisma.driver.findMany();
      data = drivers.map(d => [
        d.firstName, d.lastName, d.email, d.phone, d.licenseNumber, formatDate(d.licenseExpiry), d.employmentStatus
      ]);
      break;

    case 'maintenance':
      title = 'Maintenance & Service Report';
      columns = ['Vehicle Code', 'Vehicle Name', 'Service Type', 'Labour Cost', 'Parts Cost', 'Total Cost', 'Vendor', 'Status', 'Date'];
      const maintenance = await prisma.maintenanceRecord.findMany({ include: { vehicle: true } });
      data = maintenance.map(m => [
        m.vehicle.code, m.vehicle.name, m.serviceType,
        formatNaira(m.labourCost), formatNaira(m.partsCost), formatNaira(m.totalCost),
        m.vendor || 'N/A', m.status, formatDate(m.createdAt)
      ]);
      break;

    case 'fuel':
      title = 'Fuel Consumption Report';
      columns = ['Date', 'Vehicle Code', 'Vehicle Name', 'Driver', 'Litres', 'Price/Litre', 'Total Cost', 'Odometer', 'Vendor'];
      const fuels = await prisma.fuelRecord.findMany({ include: { vehicle: true, driver: true } });
      data = fuels.map(f => [
        formatDate(f.date), f.vehicle.code, f.vehicle.name,
        f.driver ? `${f.driver.firstName} ${f.driver.lastName}` : 'N/A',
        f.litres.toString(), formatNaira(f.pricePerLitre), formatNaira(f.totalCost),
        f.odometer.toString(), f.vendor || 'N/A'
      ]);
      break;

    case 'executive':
      title = 'Executive Operating Cost Summary';
      columns = ['Vehicle Code', 'Vehicle Name', 'Total Fuel Cost', 'Total Maintenance Cost', 'Total Expenses', 'Fleet Cost'];
      const execVehicles = await prisma.vehicle.findMany({
        include: { fuelRecords: true, maintenanceRecords: true, expenses: true }
      });
      data = execVehicles.map(v => {
        const fuel = v.fuelRecords.reduce((acc, curr) => acc + curr.totalCost, 0);
        const maint = v.maintenanceRecords.reduce((acc, curr) => acc + curr.totalCost, 0);
        const exp = v.expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const total = fuel + maint + exp;
        execTotals.totalFuel += fuel;
        execTotals.totalMaint += maint;
        execTotals.totalExp += exp;
        execTotals.totalAll += total;
        return [
          v.code, v.name,
          formatNaira(fuel), formatNaira(maint), formatNaira(exp), formatNaira(total)
        ];
      });
      break;

    default:
      return new NextResponse('Invalid report type', { status: 400 });
  }

  if (format === 'csv') {
    const csvContent = [
      columns.join(','),
      ...data.map(row => row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="vehico_${reportType}_report.csv"`
      }
    });
  }

  if (format === 'excel') {
    const ws = XLSX.utils.aoa_to_sheet([columns, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="vehico_${reportType}_report.xlsx"`
      }
    });
  }

  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedAt = formatDate(new Date());
    const meta = `Generated ${generatedAt}`;

    drawPdfHeader(doc, title, meta, pageWidth);

    // Intro section
    let y = 38;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.dark);
    doc.text(title, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      'Official fleet operations export  ·  For internal use only  ·  Figures in Nigerian Naira (₦) where applicable',
      14,
      y + 5.5
    );

    y = 50;
    const summaryCards = buildSummary(reportType, data, execTotals);
    y = drawSummaryCards(doc, summaryCards, y, pageWidth);

    // Extra executive totals row
    if (reportType === 'executive') {
      const detailCards = [
        { label: 'Fuel Total', value: formatNaira(execTotals.totalFuel) },
        { label: 'Maintenance Total', value: formatNaira(execTotals.totalMaint) },
        { label: 'Expenses Total', value: formatNaira(execTotals.totalExp) },
        { label: 'Grand Total', value: formatNaira(execTotals.totalAll) },
      ];
      y = drawSummaryCards(doc, detailCards, y, pageWidth);
    }

    autoTable(doc, {
      head: [columns],
      body: data.length > 0 ? data : [['No records found for this report.']],
      startY: y,
      margin: { left: 14, right: 14, top: 36, bottom: 18 },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 3.2, right: 3, bottom: 3.2, left: 3 },
        textColor: BRAND.dark,
        lineColor: BRAND.border,
        lineWidth: 0.2,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: BRAND.primary,
        textColor: BRAND.white,
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
        cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
      bodyStyles: {
        fillColor: BRAND.white,
      },
      columnStyles: Object.fromEntries(
        columns.map((_, i) => [i, { cellWidth: 'auto' as const }])
      ),
      didDrawPage: (hookData) => {
        // Redraw header on every page after the first
        if (hookData.pageNumber > 1) {
          drawPdfHeader(doc, title, meta, pageWidth);
        }
      },
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawPdfFooter(doc, pageWidth, pageHeight, i, totalPages);
    }

    const pdfBuf = doc.output('arraybuffer');

    return new NextResponse(pdfBuf as unknown as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vehico_${reportType}_report.pdf"`
      }
    });
  }

  return new NextResponse('Invalid format', { status: 400 });
}
