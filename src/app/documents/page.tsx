import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, Upload, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const documents = await prisma.document.findMany({
    include: {
      vehicle: true,
      driver: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header title="Documents & Compliance" />
      <div className="page-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Vehicle & Driver Documents</h3>
            <p className="text-xs text-slate-500">Store insurance policies, roadworthiness certificates, and receipts.</p>
          </div>
          <Button variant="primary" size="sm">
            <Upload className="w-4 h-4" /> Upload Document
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Associated Entity</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                      No compliance documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {doc.title}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#0F6B4B]">{doc.type}</td>
                      <td className="py-3 px-4 text-slate-700 text-xs">
                        {doc.vehicle
                          ? `Vehicle: ${doc.vehicle.code}`
                          : doc.driver
                          ? `Driver: ${doc.driver.firstName} ${doc.driver.lastName}`
                          : "General"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{formatDate(doc.expiryDate)}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{formatDate(doc.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" /> Download
                        </Button>
                      </td>
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
