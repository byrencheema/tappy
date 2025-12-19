"use client";

import { AgenticStep, SkillStatus } from "@/types/api";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

interface AgenticStepsProps {
  steps: AgenticStep[];
  className?: string;
}

export default function AgenticSteps({ steps, className = "" }: AgenticStepsProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  const getStatusIcon = (status: SkillStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: SkillStatus) => {
    switch (status) {
      case "completed":
        return "bg-green-50 border-green-200";
      case "failed":
        return "bg-red-50 border-red-200";
      case "running":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">Agentic Workflow</h3>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={`${step.type}-${index}`}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${getStatusColor(
              step.status
            )}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getStatusIcon(step.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <span className="text-xs text-gray-500 capitalize">{step.type}</span>
              </div>
              {step.message && (
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{step.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
