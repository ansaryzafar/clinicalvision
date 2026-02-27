# Workflow V3 Migration Guide

This guide explains how to migrate from the old workflow system to Workflow V3.

---

## Quick Start

### 1. Import from the new module

```tsx
// OLD
import { WorkflowContext, useWorkflowContext } from '@/contexts/WorkflowContext';
import { isStepCompleted, canAdvanceToStep } from '@/utils/workflowUtils';

// NEW
import { 
  WorkflowProvider, 
  useWorkflow,
  WorkflowStepper,
  WorkflowStep,
  isStepComplete,
  canNavigateToStep,
} from '@/workflow-v3';
```

### 2. Wrap your app with the new provider

```tsx
// OLD
<WorkflowProvider>
  <DiagnosticWorkstation />
</WorkflowProvider>

// NEW (same pattern, just different import)
import { WorkflowProvider } from '@/workflow-v3';

<WorkflowProvider>
  <DiagnosticWorkstation />
</WorkflowProvider>
```

### 3. Update hook usage

```tsx
// OLD
const { 
  sessionData, 
  updateSessionData, 
  workflowState,
  navigateToStep,
} = useWorkflowContext();

// Check completion
const isUploadComplete = workflowState.completedSteps.includes(WorkflowStep.UPLOAD);

// NEW
const {
  session,
  updateSession,
  navigateToStep,
  isStepComplete,
  getStepState,
} = useWorkflow();

// Check completion (derived from data, not array)
const isUploadComplete = isStepComplete(WorkflowStep.UPLOAD);
```

---

## Key API Changes

### Session Data Structure

```tsx
// OLD - Separate concerns
interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];  // ❌ REMOVED - derived now
  mode: WorkflowMode;
}

interface SessionData {
  images: ImageData[];
  analysisResults: AnalysisResults | null;
  // ...
}

// NEW - Unified session
interface WorkflowSession {
  // Navigation state
  currentStep: WorkflowStep;
  mode: WorkflowMode;
  status: 'active' | 'completed';
  
  // Data (completion derived from these)
  images: ImageData[];
  analysisResults: AnalysisResults | null;
  patientInfo: PatientInfo;
  measurements: Measurement[];
  assessment: Assessment;
}
```

### Step Completion

```tsx
// OLD - Manual tracking with array
const completedSteps = workflowState.completedSteps;
if (images.length > 0 && !completedSteps.includes(UPLOAD)) {
  setCompletedSteps([...completedSteps, UPLOAD]);
}

// NEW - Automatically derived
// No manual tracking needed! Just update the data:
updateSession({ images: newImages });

// Check completion:
isStepComplete(WorkflowStep.UPLOAD); // Returns true if images.length > 0
```

### Step State (for UI)

```tsx
// OLD - Complex logic in component
const getStepState = (step) => {
  if (completedSteps.includes(step)) return 'completed';  // ❌ BUG: showed completed for current
  if (currentStep === step) return 'current';
  // ...
};

// NEW - Priority order enforced
const state = getStepState(WorkflowStep.UPLOAD);
// Returns: 'current' | 'completed' | 'available' | 'locked'
// ✅ 'current' always takes priority over 'completed'
```

### Navigation

```tsx
// OLD
const canAdvance = canAdvanceToStep(sessionData, targetStep);
navigateToStep(targetStep);

// NEW
const canNavigate = canNavigateToStep(WorkflowStep.AI_ANALYSIS);
const success = navigateToStep(WorkflowStep.AI_ANALYSIS); // Returns boolean
```

### Session Persistence

```tsx
// OLD - Deferred save with markDirty()
updateSessionData({ patientInfo: newPatientInfo });  // Only marks dirty
// Auto-save runs later... but reads stale localStorage!  ❌ BUG

// NEW - Immediate persistence
updateSession({ patientInfo: newPatientInfo });  // Saves immediately ✅
```

---

## Component Migration

### WorkflowStepper

```tsx
// OLD
<WorkflowStepper
  currentStep={workflowState.currentStep}
  completedSteps={workflowState.completedSteps}
  mode={workflowState.mode}
  onStepClick={handleStepClick}
/>

// NEW - Gets everything from context
<WorkflowStepper />

// Or with options
<WorkflowStepper compact />
<VerticalStepper />
<MiniStepper />
```

### Creating Sessions

```tsx
// OLD - Mode could come from localStorage (bug!)
const mode = localStorage.getItem('mode') || 'clinical';
createSession(mode);

// NEW - Mode is always explicit
createSession('clinical');  // Explicit mode, never from localStorage
```

---

## Function Mapping Reference

| Old Function | New Function | Notes |
|--------------|--------------|-------|
| `useWorkflowContext()` | `useWorkflow()` | New hook name |
| `sessionData` | `session` | Unified session object |
| `updateSessionData()` | `updateSession()` | Now persists immediately |
| `workflowState.completedSteps` | `isStepComplete(step)` | Derived, not stored |
| `canAdvanceToStep()` | `canNavigateToStep()` | Same logic, cleaner API |
| `markStepComplete()` | N/A | Removed - completion is derived |
| `getStepDisplayState()` | `getStepState()` | Priority: current > completed |
| `saveSession()` | N/A | Happens automatically |

---

## Testing Your Migration

### 1. Run the V3 tests

```bash
cd clinicalvision_frontend
npm test -- --testPathPattern="workflow-v3"
```

### 2. Verify bug fixes

```tsx
// Test Bug #1: Immediate persistence
updateSession({ patientInfo: { ...session.patientInfo, id: 'TEST' } });
// Check localStorage immediately - should have new value

// Test Bug #2: Current step priority
// When UPLOAD is complete but current, getStepState should return 'current'
session.images.length > 0; // true (complete)
session.currentStep === WorkflowStep.UPLOAD; // true (current)
getStepState(WorkflowStep.UPLOAD); // Should be 'current', NOT 'completed'

// Test Bug #3: Auto-advance
// After AI analysis completes, currentStep should advance

// Test Bug #4: Explicit mode
createSession('quick');
session.mode; // Should be 'quick', regardless of localStorage
```

---

## Gradual Migration Strategy

1. **Phase 1**: Add V3 alongside V1
   - Import from `@/workflow-v3` 
   - Both systems can coexist temporarily

2. **Phase 2**: Migrate components one at a time
   - Start with `WorkflowStepper`
   - Then `DiagnosticWorkstation`
   - Then individual step panels

3. **Phase 3**: Remove old code
   - Delete `contexts/WorkflowContext.tsx`
   - Delete `contexts/WorkflowContextV2.tsx`
   - Delete `utils/workflowUtils.ts`
   - Delete `utils/workflowUtilsV2.ts`
   - Delete `components/workflow/WorkflowStepper.tsx`
   - Delete `services/clinicalSession.service.ts`

4. **Phase 4**: Clean up storage
   - Old keys: `clinicalvision_sessions`, `clinicalvision_current_session`
   - New keys: `clinicalvision_v3_sessions`, `clinicalvision_v3_current_session`
   - Migration script can copy data if needed

---

## Troubleshooting

### "Cannot find module '@/workflow-v3'"

Add the path alias to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/workflow-v3": ["./src/workflow-v3"],
      "@/workflow-v3/*": ["./src/workflow-v3/*"]
    }
  }
}
```

### "useWorkflow must be used within a WorkflowProvider"

Make sure `WorkflowProvider` wraps your component tree:
```tsx
import { WorkflowProvider } from '@/workflow-v3';

function App() {
  return (
    <WorkflowProvider>
      <YourComponents />
    </WorkflowProvider>
  );
}
```

### Session not persisting

V3 uses different localStorage keys. Check:
- `clinicalvision_v3_sessions`
- `clinicalvision_v3_current_session`

### Step stuck on old state

Clear localStorage and refresh:
```javascript
localStorage.removeItem('clinicalvision_v3_sessions');
localStorage.removeItem('clinicalvision_v3_current_session');
```
