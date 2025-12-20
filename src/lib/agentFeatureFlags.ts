/**
 * Agent Feature Flags
 * 
 * Global feature flags for agent functionality.
 * Used to control rollout of new features.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AgentFeatureFlags {
  // TOON Summary feature - compresses conversation history
  useTOONSummary: boolean;
  setUseTOONSummary: (enabled: boolean) => void;

  // Debug mode - shows raw TOON in DevTools
  debugTOON: boolean;
  setDebugTOON: (enabled: boolean) => void;

  // Warm-start feature - reuses saved skills
  useWarmStart: boolean;
  setUseWarmStart: (enabled: boolean) => void;
}

export const useAgentFeatureFlags = create<AgentFeatureFlags>()(
  persist(
    (set) => ({
      // Default: TOON summary disabled until stable
      useTOONSummary: false,
      setUseTOONSummary: (enabled) => set({ useTOONSummary: enabled }),

      // Debug mode off by default
      debugTOON: false,
      setDebugTOON: (enabled) => set({ debugTOON: enabled }),

      // Warm-start enabled by default
      useWarmStart: true,
      setUseWarmStart: (enabled) => set({ useWarmStart: enabled }),
    }),
    {
      name: 'agent-feature-flags',
    }
  )
);

/**
 * Check if we're in staging/development environment
 */
export const isStaging = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname.includes('staging');
};
