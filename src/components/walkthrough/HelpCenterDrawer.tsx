"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  CheckCircle2,
  Circle,
  HelpCircle,
  Search,
  BookOpen,
  CheckSquare,
  Command,
  Car,
  LayoutDashboard,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  FileText,
  Download,
} from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";
import { TOUR_TRACKS, ONBOARDING_CHECKLIST, FAQS, KEYBOARD_SHORTCUTS } from "./tours";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  Car,
  CheckSquare,
  RefreshCw,
  FileText,
};

export function HelpCenterDrawer() {
  const {
    isHelpOpen,
    closeHelp,
    startTour,
    completedTours,
    completedChecklist,
    toggleChecklist,
  } = useWalkthrough();

  const [activeTab, setActiveTab] = useState<"tours" | "checklist" | "faqs" | "shortcuts">("tours");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isHelpOpen) return null;

  const totalChecklist = ONBOARDING_CHECKLIST.length;
  const doneChecklist = completedChecklist.length;
  const progressPercent = Math.round((doneChecklist / totalChecklist) * 100);

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9980] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={closeHelp}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                Help & Operations Center
              </h2>
              <p className="text-[11px] text-slate-400">System guides, walkthroughs, and manual</p>
            </div>
          </div>

          <button
            onClick={closeHelp}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close Help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Manual Download Bar */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="text-xs font-semibold text-slate-800 truncate">System User Manual (PDF)</span>
          </div>
          <a
            href="/docs/Faco_Fleet_User_Manual.pdf"
            download="Faco_Fleet_User_Manual.pdf"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs shrink-0"
          >
            <Download className="w-3 h-3 text-slate-600" />
            Download
          </a>
        </div>

        {/* Tab Navigation */}
        <div className="px-3 pt-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("tours")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "tours"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Tours
            </button>

            <button
              onClick={() => setActiveTab("checklist")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "checklist"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Checklist
              {doneChecklist > 0 && (
                <span className="ml-1 text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-bold">
                  {doneChecklist}/{totalChecklist}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("faqs")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "faqs"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              FAQs
            </button>

            <button
              onClick={() => setActiveTab("shortcuts")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "shortcuts"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Command className="w-3.5 h-3.5" />
              Keys
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: GUIDED TOURS */}
          {activeTab === "tours" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Select an operational workflow to start an interactive screen-by-screen walkthrough:
              </p>

              {TOUR_TRACKS.map((track) => {
                const Icon = ICONS[track.iconName] || LayoutDashboard;
                const isDone = completedTours.includes(track.id);

                return (
                  <div
                    key={track.id}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">{track.title}</h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {track.duration}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {track.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-medium text-slate-500">
                        {track.steps.length} steps
                      </span>

                      <button
                        type="button"
                        onClick={() => startTour(track.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          isDone
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-slate-900 text-white hover:bg-slate-800 shadow-2xs"
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                            Replay Tour
                          </>
                        ) : (
                          <>
                            Start Walkthrough
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="space-y-4">
              {/* Progress Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                  <span>Getting Started Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-900 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {doneChecklist} of {totalChecklist} tasks completed.
                </p>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5">
                {ONBOARDING_CHECKLIST.map((item) => {
                  const isChecked = completedChecklist.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-3.5 transition-all ${
                        isChecked
                          ? "bg-slate-50 border-slate-200 opacity-75"
                          : "bg-white border-slate-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleChecklist(item.id)}
                          className="mt-0.5 text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                          aria-label={isChecked ? "Mark incomplete" : "Mark complete"}
                        >
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-slate-900" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h4
                            className={`text-xs font-bold ${
                              isChecked ? "line-through text-slate-400" : "text-slate-800"
                            }`}
                          >
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>

                          <div className="flex items-center gap-2 mt-2.5">
                            {item.tourId && (
                              <button
                                type="button"
                                onClick={() => startTour(item.tourId!)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 hover:underline"
                              >
                                Interactive tour
                              </button>
                            )}

                            <Link
                              href={item.href}
                              onClick={closeHelp}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline ml-auto"
                            >
                              Go to screen
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FAQS */}
          {activeTab === "faqs" && (
            <div className="space-y-3.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions or topics..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-2">
                {filteredFaqs.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No questions matching your search.
                  </p>
                ) : (
                  filteredFaqs.map((faq) => (
                    <details
                      key={faq.id}
                      className="group border border-slate-200 rounded-xl p-3 bg-white"
                    >
                      <summary className="text-xs font-bold text-slate-800 cursor-pointer list-none flex items-center justify-between gap-2">
                        <span>{faq.question}</span>
                        <span className="text-slate-400 group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                      <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100 leading-relaxed">
                        {faq.answer}
                      </p>
                    </details>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SHORTCUTS */}
          {activeTab === "shortcuts" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Keyboard shortcuts for quick navigation:
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {KEYBOARD_SHORTCUTS.map((sc, i) => (
                  <div key={i} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{sc.label}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-0.5 text-[11px] font-mono font-bold bg-slate-100 border border-slate-300 rounded text-slate-800"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0 text-center">
          <p className="text-[11px] text-slate-500">
            Press <kbd className="px-1 py-0.5 font-mono text-[10px] bg-white border border-slate-300 rounded">?</kbd> anytime to toggle this center.
          </p>
        </div>
      </aside>
    </div>
  );
}
