"use client";

import React from "react";
import { Check, User, ScanLine, Stethoscope, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = 1 | 2 | 3 | 4;

interface StepConfig {
  id: WorkflowStep;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

const STEPS: StepConfig[] = [
  { id: 1, icon: User,        title: "Patient Intake",     subtitle: "Demographics & Medical Info" },
  { id: 2, icon: ScanLine,    title: "Scan & AI Analysis", subtitle: "Upload & Run Diagnostics" },
  { id: 3, icon: Stethoscope, title: "Doctor's Review",    subtitle: "Inspect Findings & Sign-off" },
  { id: 4, icon: Mail,        title: "Report Dispatch",    subtitle: "Transmit to Patient" },
];

interface WorkflowTimelineProps {
  currentStep: WorkflowStep;
  completedSteps: Set<WorkflowStep>;
  onStepClick?: (step: WorkflowStep) => void;
}

export default function WorkflowTimeline({
  currentStep,
  completedSteps,
  onStepClick,
}: WorkflowTimelineProps) {
  return (
    <div
      className="bg-white border border-[#DCE8F0] rounded-[16px] shadow-[0_1px_3px_rgba(11,34,57,0.04),0_4px_12px_rgba(11,34,57,0.03)] overflow-hidden"
      role="navigation"
      aria-label="Clinical workflow steps"
    >
      {/* Top gradient accent line */}
      <div className="h-[3px] bg-gradient-to-r from-[#0F74C9] via-[#0E9F8E] to-[#0F74C9]" />

      <div className="px-5 py-3.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#7A91A6]">
            Clinical Workflow
          </span>
          <span className="text-[11px] font-mono font-bold text-[#0F74C9] bg-[#EBF4FC] border border-[#BAE6FD] px-2.5 py-0.5 rounded-[6px]">
            Step {currentStep} of 4
          </span>
        </div>

        {/* Step Indicators */}
        <div className="flex items-start gap-0">
          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === currentStep;
            const isClickable = isCompleted || step.id <= currentStep;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                {/* Step node */}
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick?.(step.id)}
                    disabled={!isClickable}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Step ${step.id}: ${step.title} — ${isCompleted ? "Completed" : isCurrent ? "Current" : "Pending"}`}
                    className={cn(
                      "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 flex-shrink-0",
                      isCompleted
                        ? "bg-gradient-to-br from-[#0E9F8E] to-[#059669] border-[#0E9F8E] shadow-[0_0_12px_rgba(14,159,142,0.3)] cursor-pointer"
                        : isCurrent
                        ? "bg-gradient-to-br from-[#0F74C9] to-[#0284C7] border-[#0F74C9] shadow-[0_0_14px_rgba(15,116,201,0.35)] cursor-default"
                        : "bg-white border-[#DCE8F0] cursor-not-allowed",
                      isClickable && !isCurrent ? "hover:scale-105 hover:shadow-md" : ""
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-[18px] h-[18px] text-white" strokeWidth={3} />
                    ) : (
                      <Icon
                        className={cn(
                          "w-[18px] h-[18px]",
                          isCurrent ? "text-white" : "text-[#A4B7C6]"
                        )}
                      />
                    )}

                    {/* Pulse ring for current step */}
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-full border-2 border-[#0F74C9] animate-ping opacity-30" aria-hidden="true" />
                    )}
                  </button>

                  {/* Step label */}
                  <div className="mt-2 text-center px-1 hidden sm:block">
                    <p
                      className={cn(
                        "text-[11px] font-bold leading-tight",
                        isCurrent ? "text-[#0F74C9]" : isCompleted ? "text-[#0E9F8E]" : "text-[#A4B7C6]"
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-[10px] text-[#7A91A6] leading-tight mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                {/* Connector line between steps */}
                {idx < STEPS.length - 1 && (
                  <div className="flex items-center mt-4 flex-shrink-0 w-6 sm:w-10 md:w-16 lg:w-20">
                    <div
                      className={cn(
                        "h-[2px] w-full transition-all duration-500",
                        completedSteps.has(step.id)
                          ? "bg-gradient-to-r from-[#0E9F8E] to-[#0F74C9]"
                          : "bg-[#DCE8F0]"
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
