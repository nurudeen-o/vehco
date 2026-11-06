"use client";

import React from "react";
import { HelpCircle, X, ArrowRight } from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";

export function WelcomeTourToast() {
  const { showWelcome, startTour, dismissWelcome } = useWalkthrough();

  if (!showWelcome) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9970] max-w-sm w-[calc(100vw-40px)] bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-in slide-in-from-bottom-3 fade-in duration-200">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Welcome to Faco Fleet
            </h4>
            <button
              onClick={dismissWelcome}
              className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Take a 2-minute walkthrough to learn how vehicle registration, QR stickers, and offline sync work.
          </p>

          <div className="flex items-center gap-2 mt-3.5">
            <button
              type="button"
              onClick={() => startTour("system-overview")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-all active:scale-[0.98]"
            >
              Start Walkthrough
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={dismissWelcome}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
