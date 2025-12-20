/**
 * Agent State Store
 * 
 * Zustand store for agent-specific state including TOON summaries,
 * active plans, and debug information.
 */

import { create } from 'zustand';

export interface ToonSummaryState {
  meta: {
    version: string;
    timestamp: string;
    messagesCompressed: number;
  };
  conversationSummary: string;
  activePlan?: string[];
  keyEntities?: string[];
  pendingActions?: string[];
}

export interface AgentState {
  // Latest TOON summary from conversation compression
  latestSummary: ToonSummaryState | null;
  rawToonText: string | null;
  
  // Active plan steps and progress
  activePlan: string[];
  currentPlanStep: number;
  
  // Debug state
  showRawToon: boolean;
  
  // Actions
  setLatestSummary: (summary: ToonSummaryState | null, rawText?: string) => void;
  setActivePlan: (plan: string[], currentStep?: number) => void;
  setCurrentPlanStep: (step: number) => void;
  toggleShowRawToon: () => void;
  clearState: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  latestSummary: null,
  rawToonText: null,
  activePlan: [],
  currentPlanStep: 0,
  showRawToon: false,

  setLatestSummary: (summary, rawText) => set({ 
    latestSummary: summary,
    rawToonText: rawText ?? null,
    // Update active plan from summary if present
    activePlan: summary?.activePlan ?? [],
  }),

  setActivePlan: (plan, currentStep = 0) => set({ 
    activePlan: plan, 
    currentPlanStep: currentStep 
  }),

  setCurrentPlanStep: (step) => set({ currentPlanStep: step }),

  toggleShowRawToon: () => set((state) => ({ showRawToon: !state.showRawToon })),

  clearState: () => set({
    latestSummary: null,
    rawToonText: null,
    activePlan: [],
    currentPlanStep: 0,
  }),
}));
