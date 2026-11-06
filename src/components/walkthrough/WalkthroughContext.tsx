"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TourTrack, TourStep } from "./types";
import { TOUR_TRACKS } from "./tours";

type WalkthroughContextValue = {
  isHelpOpen: boolean;
  activeTour: TourTrack | null;
  currentStepIndex: number;
  currentStep: TourStep | null;
  completedTours: string[];
  completedChecklist: string[];
  showWelcome: boolean;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  toggleChecklist: (id: string) => void;
  dismissWelcome: () => void;
};

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

const STORAGE_KEY = "faco_walkthrough_state_v1";

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<TourTrack | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<string[]>([]);
  const [completedChecklist, setCompletedChecklist] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompletedTours(parsed.completedTours || []);
        setCompletedChecklist(parsed.completedChecklist || []);
        if (!parsed.hasSeenWelcome) {
          setShowWelcome(true);
        }
      } else {
        setShowWelcome(true);
      }
    } catch {
      setShowWelcome(true);
    }
    setIsInitialized(true);
  }, []);

  const saveState = useCallback(
    (tours: string[], checklist: string[], hasSeenWelcome = true) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            completedTours: tours,
            completedChecklist: checklist,
            hasSeenWelcome,
          })
        );
      } catch {}
    },
    []
  );

  const startTour = useCallback(
    (tourId: string) => {
      const track = TOUR_TRACKS.find((t) => t.id === tourId);
      if (!track || track.steps.length === 0) return;

      setIsHelpOpen(false);
      setShowWelcome(false);
      setActiveTour(track);
      setCurrentStepIndex(0);

      const firstStep = track.steps[0];
      if (firstStep.route && typeof window !== "undefined" && window.location.pathname !== firstStep.route) {
        router.push(firstStep.route);
      }
    },
    [router]
  );

  const endTour = useCallback(() => {
    if (activeTour) {
      setCompletedTours((prev) => {
        if (!prev.includes(activeTour.id)) {
          const updated = [...prev, activeTour.id];
          saveState(updated, completedChecklist);
          return updated;
        }
        return prev;
      });
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, [activeTour, completedChecklist, saveState]);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStepIndex < activeTour.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      const nextStepObj = activeTour.steps[nextIdx];
      setCurrentStepIndex(nextIdx);

      if (nextStepObj.route && typeof window !== "undefined" && window.location.pathname !== nextStepObj.route) {
        router.push(nextStepObj.route);
      }
    } else {
      endTour();
    }
  }, [activeTour, currentStepIndex, endTour, router]);

  const prevStep = useCallback(() => {
    if (!activeTour || currentStepIndex <= 0) return;
    const prevIdx = currentStepIndex - 1;
    const prevStepObj = activeTour.steps[prevIdx];
    setCurrentStepIndex(prevIdx);

    if (prevStepObj.route && typeof window !== "undefined" && window.location.pathname !== prevStepObj.route) {
      router.push(prevStepObj.route);
    }
  }, [activeTour, currentStepIndex, router]);

  const toggleChecklist = useCallback(
    (id: string) => {
      setCompletedChecklist((prev) => {
        const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
        saveState(completedTours, next);
        return next;
      });
    },
    [completedTours, saveState]
  );

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    saveState(completedTours, completedChecklist, true);
  }, [completedTours, completedChecklist, saveState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsHelpOpen((v) => !v);
      } else if (e.key === "Escape") {
        if (activeTour) {
          endTour();
        } else if (isHelpOpen) {
          setIsHelpOpen(false);
        }
      } else if (activeTour) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          nextStep();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          prevStep();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTour, isHelpOpen, nextStep, prevStep, endTour]);

  const currentStep = activeTour ? activeTour.steps[currentStepIndex] || null : null;

  return (
    <WalkthroughContext.Provider
      value={{
        isHelpOpen,
        activeTour,
        currentStepIndex,
        currentStep,
        completedTours,
        completedChecklist,
        showWelcome: isInitialized && showWelcome,
        startTour,
        nextStep,
        prevStep,
        endTour,
        openHelp: () => setIsHelpOpen(true),
        closeHelp: () => setIsHelpOpen(false),
        toggleHelp: () => setIsHelpOpen((v) => !v),
        toggleChecklist,
        dismissWelcome,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
}

export function useWalkthrough() {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) {
    throw new Error("useWalkthrough must be used within WalkthroughProvider");
  }
  return ctx;
}
