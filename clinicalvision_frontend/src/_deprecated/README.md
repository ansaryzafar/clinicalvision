# ⚠️ Deprecated Code — Do Not Use

These files are **legacy workflow code** that has been superseded by the
redesigned V2 clinical workflow system (`ClinicalWorkflowPageV2` +
`ClinicalCaseContext`).

They are preserved here for reference and git history but are **not imported
by any active route or component**.

## Deprecated on: 2026-02-23

## What replaced them

| Deprecated File | Replaced By |
|---|---|
| `pages/ClinicalWorkflowPage.tsx` (V1, 6-step) | `pages/ClinicalWorkflowPageV2.tsx` (12-step ACR BI-RADS) |
| `pages/DiagnosticWorkstation.tsx` (935 lines) | `pages/ClinicalWorkflowPageV2.tsx` (572 lines) |
| `contexts/WorkflowContextV2.tsx` (bridge) | `contexts/ClinicalCaseContext.tsx` |
| `components/workflow/WorkflowStepper.tsx` (V1) | V2 uses inline tab navigation |
| `components/workflow/WorkflowStepperV2.tsx` (bridge) | V2 uses inline tab navigation |
| `hooks/useWorkflowBridge.ts` | No longer needed — single context |
| `utils/workflowUtilsV2.ts` | `utils/caseOperations.ts` + `ClinicalCaseContext` |
| `utils/workflowDebug.ts` | No longer needed |

## Still active (NOT deprecated)

These files are still used by active dashboard pages and will be migrated in a
future iteration:

- `contexts/WorkflowContext.tsx` — used by ClinicalDashboard, CasesDashboard, PatientRecords
- `workflow-v3/` module — provides `WorkflowProvider` and `useLegacyWorkflow`
- `utils/workflowUtils.ts` — used by CasesDashboard, PatientRecords
- `utils/workflowStateMachine.ts` — used by ClinicalCaseContext
