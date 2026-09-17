export interface WorkflowStageDefinition {
  id: "ingestion" | "routing" | "pathology";
  stepNumber: number;
  labelKey: string;
  badgeLabel: string;
  description: string;
}

export const WORKFLOW_STAGES: WorkflowStageDefinition[] = [
  {
    id: "ingestion",
    stepNumber: 1,
    labelKey: "1. Scan Ingestion",
    badgeLabel: "Scan Upload",
    description: "Radiograph ingestion and pre-processing",
  },
  {
    id: "routing",
    stepNumber: 2,
    labelKey: "2. Domain Routing",
    badgeLabel: "Anatomical Routing",
    description: "Hierarchical neural domain classification",
  },
  {
    id: "pathology",
    stepNumber: 3,
    labelKey: "3. Diagnostic Result & Sign-Off",
    badgeLabel: "Pathology Finding",
    description: "Pathology evaluation and clinical dispatch",
  },
];
