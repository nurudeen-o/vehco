"use client";
import { useRecordId } from "@/lib/useRecordId";

import { useEffect, useState, use } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { AppLogo } from "@/components/shared/AppLogo";
import { buildVerifyUrl } from "@/lib/constants";

export default function VehicleQRPage() {
  const id = useRecordId();
  const [vehicle, setVehicle] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [cardFormat, setCardFormat] = useState<"card" | "sticker" | "tag">("card");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/vehicles/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.id) return;
        setVehicle(data);
        QRCode.toDataURL(buildVerifyUrl(data.code), { width: 300, margin: 2 }).then(setQrDataUrl);
      })
      .catch(() => {});
  }, [id]);

  if (!vehicle) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading printable QR identification card...
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Header title={`Printable QR Card - ${vehicle.code}`} />
      <div className="page-pad">
        <div className="flex items-center justify-between no-print">
          <Link href={`/vehicles/view?id=${vehicle.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to Vehicle
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex border border-slate-200 rounded-lg p-1 bg-white">
              <button
                onClick={() => setCardFormat("card")}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  cardFormat === "card" ? "bg-[#0F6B4B] text-white" : "text-slate-600"
                }`}
              >
                Identification Card
              </button>
              <button
                onClick={() => setCardFormat("sticker")}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  cardFormat === "sticker" ? "bg-[#0F6B4B] text-white" : "text-slate-600"
                }`}
              >
                Windshield Sticker
              </button>
              <button
                onClick={() => setCardFormat("tag")}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  cardFormat === "tag" ? "bg-[#0F6B4B] text-white" : "text-slate-600"
                }`}
              >
                Hanging Tag
              </button>
            </div>

            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="flex justify-center py-6">
          {cardFormat === "card" && (
            <div className="w-[450px] bg-white border-2 border-slate-900 rounded-2xl shadow-xl overflow-hidden print:shadow-none">
              <div className="bg-[#0F6B4B] text-white p-4 flex items-center justify-between">
                <AppLogo size={48} showText dark />
                <div className="text-right">
                  <span className="text-xs font-mono font-bold bg-[#F4B400] text-slate-900 px-2 py-0.5 rounded">
                    {vehicle.code}
                  </span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-3 gap-4 items-center">
                <div className="col-span-1 flex justify-center">
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="Vehicle QR Code" className="w-32 h-32 border border-slate-200 rounded-lg" />
                  )}
                </div>
                <div className="col-span-2 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Vehicle Name</span>
                    <span className="font-bold text-slate-900 text-sm">{vehicle.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Registration</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">{vehicle.registrationNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Make & Model</span>
                    <span className="text-slate-700 font-medium">{vehicle.manufacturer} {vehicle.model} ({vehicle.year})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Assigned Driver</span>
                    <span className="text-slate-700 font-medium">
                      {vehicle.assignedDriver
                        ? `${vehicle.assignedDriver.firstName} ${vehicle.assignedDriver.lastName}`
                        : "Company Pool"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-[10px] text-slate-500 flex justify-between items-center">
                <span>Scan QR for instant verification</span>
                <span className="font-mono text-[9px]">ID: {String(vehicle.id || "").slice(0, 8)}</span>
              </div>
            </div>
          )}

          {cardFormat === "sticker" && (
            <div className="w-[320px] bg-emerald-950 text-white border-2 border-emerald-500 rounded-xl p-5 shadow-xl text-center space-y-3">
              <div className="flex justify-between items-center border-b border-emerald-800 pb-2">
                <img src="/logo.png" alt="Faco" className="h-10 w-auto rounded bg-white/10" />
                <span className="text-xs font-mono font-bold text-white">{vehicle.code}</span>
              </div>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 mx-auto bg-white p-2 rounded-lg" />
              )}
              <div className="text-xs">
                <p className="font-bold text-white text-base">{vehicle.registrationNumber}</p>
                <p className="text-emerald-300 text-[11px]">{vehicle.name}</p>
              </div>
            </div>
          )}

          {cardFormat === "tag" && (
            <div className="w-[280px] bg-white border-2 border-slate-800 rounded-t-full rounded-b-2xl p-6 shadow-xl text-center space-y-4">
              <img src="/logo.png" alt="Faco" className="h-14 w-auto mx-auto rounded-lg" />
              <h2 className="font-bold text-lg text-slate-900 leading-tight">Faco Vehicle</h2>
              <span className="inline-block bg-[#0F6B4B] text-white text-xs font-mono font-bold px-3 py-1 rounded-full">
                {vehicle.code}
              </span>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="w-36 h-36 mx-auto border border-slate-200 rounded-lg p-1" />
              )}
              <div className="text-xs font-semibold text-slate-800">
                {vehicle.registrationNumber}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
