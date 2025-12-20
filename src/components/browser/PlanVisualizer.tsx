import { CheckCircle2, Circle, ChevronRight, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAgentStore } from '@/lib/agentStore';

interface PlanVisualizerProps {
  plan?: string[];
  currentStepIndex?: number;
  className?: string;
  useStore?: boolean; // If true, read from zustand store instead of props
}

export function PlanVisualizer({ plan: propPlan, currentStepIndex: propStepIndex, className, useStore = false }: PlanVisualizerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Read from store if useStore is true
  const storePlan = useAgentStore((s) => s.activePlan);
  const storeStepIndex = useAgentStore((s) => s.currentPlanStep);
  
  const plan = useStore ? storePlan : (propPlan ?? []);
  const currentStepIndex = useStore ? storeStepIndex : (propStepIndex ?? 0);

  if (!plan || plan.length === 0) return null;

  return (
    <div className={cn("rounded-xl border border-border/40 bg-secondary/10 overflow-hidden", className)}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider text-muted-foreground/80">
          <ListTodo size={14} />
          <span>Strategic Plan</span>
          <span className="bg-secondary/50 text-[10px] px-1.5 py-0.5 rounded-full ml-1 text-foreground/70">
            {plan.length} steps
          </span>
        </div>
        <ChevronRight 
          size={14} 
          className={cn("text-muted-foreground/50 transition-transform duration-200", !isCollapsed ? "rotate-90" : "")} 
        />
      </button>
      
      {!isCollapsed && (
        <div className="p-3 pt-0 space-y-2">
          {plan.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            
            return (
              <div 
                key={idx} 
                className={cn(
                  "flex gap-3 text-sm transition-all duration-300",
                  isCompleted ? "opacity-50" : "opacity-100",
                  isCurrent ? "translate-x-1" : ""
                )}
              >
                <div className="shrink-0 pt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 size={16} className="text-green-500/70" />
                  ) : isCurrent ? (
                    <div className="relative">
                      <Circle size={16} className="text-primary" />
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    </div>
                  ) : (
                    <Circle size={16} className="text-muted-foreground/30" />
                  )}
                </div>
                <div className={cn(
                  "leading-tight",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}>
                  {step}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
