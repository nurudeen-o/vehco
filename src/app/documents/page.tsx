"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  X,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileCheck,
  Calendar,
  Car,
  User,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/offline/config";

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  expiryDate?: string | null;
  createdAt: string;
  vehicle?: {
    id: string;
    code: string;
    name: string;
    registrationNumber: string;
  } | null;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
  } | null;
}

interface VehicleOption {
  id: string;
  code: string;
  name: string;
}

interface DriverOption {
  id: string;
  firstName: string;
  lastName: string;
}

const DOCUMENT_TYPES = [
  { value: "INSURANCE", label: "Insurance Policy" },
  { value: "ROADWORTHINESS", label: "Roadworthiness Certificate" },
  { value: "REGISTRATION", label: "Vehicle Registration / Proof of Ownership" },
  { value: "DRIVER_LICENSE", label: "Driver License Copy" },
  { value: "SERVICE_RECEIPT", label: "Service / Maintenance Receipt" },
  { value: "OTHER", label: "Other Compliance Document" },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState("INSURANCE");
  const [association, setAssociation] = useState<"VEHICLE" | "DRIVER" | "GENERAL">("VEHICLE");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dropdown options
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/drivers"),
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicles(Array.isArray(vData) ? vData : vData.vehicles || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDrivers(Array.isArray(dData) ? dData : dData.drivers || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchOptions();
  }, []);

  const resetForm = () => {
    setTitle("");
    setType("INSURANCE");
    setAssociation("VEHICLE");
    setVehicleId("");
    setDriverId("");
    setExpiryDate("");
    setSelectedFile(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (uploading) return;
    setModalOpen(false);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Please enter a document title.");
      return;
    }
    if (!selectedFile) {
      setFormError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("type", type);
      if (expiryDate) formData.append("expiryDate", expiryDate);
      if (association === "VEHICLE" && vehicleId) formData.append("vehicleId", vehicleId);
      if (association === "DRIVER" && driverId) formData.append("driverId", driverId);
      formData.append("file", selectedFile);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload document.");
      }

      setModalOpen(false);
      resetForm();
      fetchDocuments();
    } catch (err: any) {
      setFormError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${docTitle}"?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      alert("Failed to delete document.");
    }
  };

  /**
   * Direct download helper: creates an invisible <a> tag and clicks it.
   * This NEVER spawns a blank popup window in Electron or browsers.
   */
  const handleDownload = (fileUrl: string, docTitle: string) => {
    const link = document.createElement("a");
    link.href = resolveMediaUrl(fileUrl);
    link.download = docTitle || "document";
    link.target = "_self";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDocuments = documents.filter((doc) => {
    if (typeFilter !== "ALL" && doc.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchVehicle = doc.vehicle
        ? doc.vehicle.code.toLowerCase().includes(q) || doc.vehicle.name.toLowerCase().includes(q)
        : false;
      const matchDriver = doc.driver
        ? `${doc.driver.firstName} ${doc.driver.lastName}`.toLowerCase().includes(q)
        : false;
      return matchTitle || matchVehicle || matchDriver;
    }
    return true;
  });

  const getExpiryBadge = (expiryDate?: string | null) => {
    if (!expiryDate) return <span className="text-xs text-slate-400">No Expiry</span>;
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
          Expired ({formatDate(expiryDate)})
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
          Expires in {diffDays}d ({formatDate(expiryDate)})
        </span>
      );
    }
    return <span className="text-xs text-slate-600">{formatDate(expiryDate)}</span>;
  };

  return (
    <>
      <Header title="Documents & Compliance" />
      <div className="page-pad">
        {/* Top Header & Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Vehicle & Driver Compliance</h3>
            <p className="text-xs text-slate-500">
              Manage insurance policies, roadworthiness certificates, registration papers, and receipts.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenModal}
            className="flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
          >
            <Upload className="w-4 h-4" /> Upload Document
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "INSURANCE", "ROADWORTHINESS", "REGISTRATION", "OTHER"].map((tab) => (
              <button
                key={tab}
                onClick={() => setTypeFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  typeFilter === tab
                    ? "bg-[#0F6B4B] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab === "ALL" ? `All (${documents.length})` : tab.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents, vehicles, drivers..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
              />
            </div>
            <button
              onClick={fetchDocuments}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Associated Entity</th>
                  <th className="py-3 px-4">Expiry Status</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      Loading compliance documents...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No documents found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Click &ldquo;Upload Document&rdquo; above to attach insurance or certificates.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0F6B4B] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="truncate max-w-xs">{doc.title}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#0F6B4B]">
                          {doc.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {doc.vehicle ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-800 font-medium">
                            <Car className="w-3.5 h-3.5 text-slate-400" />
                            {doc.vehicle.code} ({doc.vehicle.name})
                          </span>
                        ) : doc.driver ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-800 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {doc.driver.firstName} {doc.driver.lastName}
                          </span>
                        ) : (
                          <span className="text-slate-400">General Fleet Document</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getExpiryBadge(doc.expiryDate)}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{formatDate(doc.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(doc.fileUrl, doc.title)}
                            title="Download document file"
                            className="cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" /> Download
                          </Button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Upload Document Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0F6B4B] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Upload Compliance Document</h3>
                  <p className="text-xs text-slate-400">Attach policies, roadworthiness certificates, or receipts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={uploading}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-5 space-y-4">
              {/* Document Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Commercial Third-Party Insurance 2026"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              {/* Document Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                  >
                    {DOCUMENT_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry Date <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                  />
                </div>
              </div>

              {/* Association Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Associate With
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "VEHICLE", label: "Vehicle" },
                    { id: "DRIVER", label: "Driver" },
                    { id: "GENERAL", label: "General" },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setAssociation(opt.id as any)}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-colors cursor-pointer ${
                        association === opt.id
                          ? "bg-emerald-50 border-[#0F6B4B] text-[#0F6B4B] font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Vehicle Selection */}
              {association === "VEHICLE" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Vehicle
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.code} — {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional Driver Selection */}
              {association === "DRIVER" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Driver
                  </label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                  >
                    <option value="">-- Choose Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.firstName} {d.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* File Upload Drop Zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload File <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-[#0F6B4B] rounded-2xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xlsx"
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-800 font-semibold">
                      <FileCheck className="w-5 h-5 text-[#0F6B4B]" />
                      <span>{selectedFile.name}</span>
                      <span className="text-slate-400 font-normal">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-slate-700">
                        Click or drag document file here to upload
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PDF, JPG, PNG, DOCX, XLSX (up to 20MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={uploading}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={uploading}
                  className="cursor-pointer"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                    </span>
                  ) : (
                    "Upload Document"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
