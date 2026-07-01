"use client";

import { createContext, useContext } from "react";
import { useChartQueue, type ChartQueue } from "@/lib/upload/use-chart-queue";

/**
 * Holds the session's chart queue once at the app root so both the Analyze and
 * Ask views share the same in-memory charts, analyses, and notes. State
 * survives client-side navigation between the two views.
 */
const ChartQueueContext = createContext<ChartQueue | null>(null);

export function ChartQueueProvider({ children }: { children: React.ReactNode }) {
  const queue = useChartQueue();
  return <ChartQueueContext.Provider value={queue}>{children}</ChartQueueContext.Provider>;
}

export function useChartQueueContext(): ChartQueue {
  const ctx = useContext(ChartQueueContext);
  if (!ctx) throw new Error("useChartQueueContext must be used within ChartQueueProvider");
  return ctx;
}
