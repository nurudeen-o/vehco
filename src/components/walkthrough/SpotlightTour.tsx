"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useWalkthrough } from "./WalkthroughContext";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function SpotlightTour() {
  const { activeTour, currentStepIndex, currentStep, nextStep, prevStep, endTour } = useWalkthrough();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [targetFound, setTargetFound] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePositions = useCallback(() => {
    if (typeof window === "undefined") return;
    setViewport({ width: window.innerWidth, height: window.innerHeight });

    if (!currentStep) {
      setTargetRect(null);
      setTargetFound(false);
      return;
    }

    const el = document.querySelector(currentStep.target);
    if (el) {
      const b = el.getBoundingClientRect();
      const padding = 6;
      setTargetRect({
        top: Math.max(0, b.top - padding),
        left: Math.max(0, b.left - padding),
        width: b.width + padding * 2,
        height: b.height + padding * 2,
      });
      setTargetFound(true);

      const inView = b.top >= 0 && b.bottom <= window.innerHeight;
      if (!inView) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      setTargetRect(null);
      setTargetFound(false);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!activeTour) return;

    updatePositions();

    const interval = setInterval(updatePositions, 250);
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [activeTour, updatePositions]);

  if (!activeTour || !currentStep) return null;

  const totalSteps = activeTour.steps.length;
  const isLast = currentStepIndex === totalSteps - 1;

  let popoverStyle: React.CSSProperties = {};
  const popoverWidth = 350;
  const popoverHeight = 210;

  if (targetRect && targetFound) {
    const preferredPlacement = currentStep.placement || "bottom";
    let idealTop = 0;
    let idealLeft = 0;

    if (preferredPlacement === "right") {
      idealLeft = targetRect.left + targetRect.width + 14;
      idealTop = targetRect.top + Math.min(24, targetRect.height / 4);
    } else if (preferredPlacement === "left") {
      idealLeft = targetRect.left - popoverWidth - 14;
      idealTop = targetRect.top + Math.min(24, targetRect.height / 4);
    } else if (preferredPlacement === "top") {
      idealTop = targetRect.top - popoverHeight - 12;
      idealLeft = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
    } else {
      // Bottom
      idealTop = targetRect.top + targetRect.height + 12;
      idealLeft = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
    }

    // Strict 4-way viewport bounds
    const top = Math.max(16, Math.min(idealTop, viewport.height - popoverHeight - 16));
    const left = Math.max(16, Math.min(idealLeft, viewport.width - popoverWidth - 16));

    popoverStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `min(${popoverWidth}px, calc(100vw - 32px))`,
      zIndex: 9999,
    };
  } else {
    // Fallback centered
    popoverStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(360px, calc(100vw - 32px))",
      zIndex: 9999,
    };
  }

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-auto">
      {/* SVG Dimmed Mask with Cutout */}
      <svg
        className="w-full h-full pointer-events-auto transition-all duration-200"
        style={{ position: "fixed", top: 0, left: 0 }}
      >
        <defs>
          <mask id="faco-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#faco-spotlight-mask)"
        />
        {targetRect && (
          <rect
            x={targetRect.left}
            y={targetRect.top}
            width={targetRect.width}
            height={targetRect.height}
            rx="8"
            ry="8"
            fill="none"
            stroke="#0F6B4B"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Popover Step Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 transition-all duration-150 animate-in fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">
              {activeTour.title}
            </span>
          </div>

          <button
            onClick={endTour}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Exit tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Body */}
        <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug mb-1.5">
          {currentStep.title}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          {currentStep.content}
        </p>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {activeTour.steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? "w-4 bg-slate-900"
                    : idx < currentStepIndex
                    ? "w-1.5 bg-slate-400"
                    : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all active:scale-[0.98]"
            >
              {isLast ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
