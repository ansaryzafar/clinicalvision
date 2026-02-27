# Workflow V3 Architecture - Clean Rewrite

**Version:** 3.0  
**Date:** February 18, 2026  
**Approach:** Test-Driven Development (TDD)

---

## Design Principles (Lessons Learned)

### 1. Single Source of Truth
- **localStorage IS the source of truth** for persistence
- **React state mirrors localStorage** for reactivity
- **NO derived state stored** - compute on every render

### 2. Immediate Persistence
- Every `updateSession()` call writes to localStorage **immediately**
- No auto-save timers that read stale data
- No `markDirty()` pattern - just save directly

### 3. Derived Completion Status
- Step completion is **ALWAYS derived** from actual session data
- No `completedSteps` array to track manually
- Single function `isStepComplete(session, step)` for all checks

### 4. Clear State Priority
```
Current Step → Blue (always visible)
Completed Step → Green (if not current)
Available Step → Dashed Blue
Locked Step → Gray
```

### 5. Separation of Concerns
```
┌─────────────────────────────────────────────────────────────────┐
│                       LAYER ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────┐                                          │
│  │   UI Components   │  ← WorkflowStepper, StepIndicator        │
│  │   (Presentational)│                                          │
│  └─────────┬─────────┘                                          │
│            │ uses                                                │
│            ▼                                                     │
│  ┌───────────────────┐                                          │
│  │  useWorkflow Hook │  ← Single hook for all workflow ops      │
│  │   (React Logic)   │                                          │
│  └─────────┬─────────┘                                          │
│            │ uses                                                │
│            ▼                                                     │
│  ┌───────────────────┐                                          │
│  │  workflowEngine   │  ← Pure functions, no side effects       │
│  │   (Business Logic)│     isStepComplete, canNavigate, etc.    │
│  └─────────┬─────────┘                                          │
│            │ uses                                                │
│            ▼                                                     │
│  ┌───────────────────┐                                          │
│  │  sessionStorage   │  ← ONLY place that touches localStorage  │
│  │   (Persistence)   │                                          │
│  └───────────────────┘                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/workflow-v3/
├── ARCHITECTURE.md           # This file
├── types.ts                  # All type definitions
├── constants.ts              # Step configs, defaults
├── sessionStorage.ts         # localStorage operations (TESTED)
├── workflowEngine.ts         # Pure business logic (TESTED)
├── useWorkflow.ts            # React hook (TESTED)
├── WorkflowStepper.tsx       # UI component (TESTED)
├── StepIndicator.tsx         # Single step UI (TESTED)
├── __tests__/
│   ├── sessionStorage.test.ts
│   ├── workflowEngine.test.ts
│   ├── useWorkflow.test.tsx
│   └── WorkflowStepper.test.tsx
└── index.ts                  # Public exports
```

---

## Data Model

### Session Interface
```typescript
interface WorkflowSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  
  // Workflow navigation (NOT completion tracking)
  currentStep: WorkflowStep;
  mode: 'quick' | 'clinical';
  status: 'active' | 'completed';
  
  // Actual data (source of truth for completion)
  images: ImageData[];
  analysisResults: AnalysisResults | null;
  patientInfo: PatientInfo;
  measurements: Measurement[];
  assessment: Assessment;
}
```

### Step Enum
```typescript
enum WorkflowStep {
  UPLOAD = 0,
  AI_ANALYSIS = 1,
  PATIENT_INFO = 2,
  MEASUREMENTS = 3,
  ASSESSMENT = 4,
  REPORT = 5,
  FINALIZE = 6,
}
```

### Step State
```typescript
type StepState = 'current' | 'completed' | 'available' | 'locked';
```

---

## Completion Derivation Rules

| Step | Is Complete When |
|------|------------------|
| UPLOAD | `session.images.length > 0` |
| AI_ANALYSIS | `session.analysisResults !== null` |
| PATIENT_INFO | `session.patientInfo.id.trim() !== ''` |
| MEASUREMENTS | `session.measurements.length > 0` |
| ASSESSMENT | `session.assessment.birads !== null` |
| REPORT | `session.assessment.impression.trim() !== ''` |
| FINALIZE | `session.status === 'completed'` |

---

## Navigation Rules

### Quick Mode (3 visible steps)
```
UPLOAD → AI_ANALYSIS → ASSESSMENT

Prerequisites:
- UPLOAD: Always accessible
- AI_ANALYSIS: Requires UPLOAD complete
- ASSESSMENT: Requires AI_ANALYSIS complete
- (FINALIZE): Requires ASSESSMENT + Patient ID
```

### Clinical Mode (7 visible steps)
```
UPLOAD → AI_ANALYSIS → PATIENT_INFO → MEASUREMENTS → ASSESSMENT → REPORT → FINALIZE

Prerequisites:
- UPLOAD: Always accessible
- AI_ANALYSIS: Requires UPLOAD complete
- PATIENT_INFO: Always accessible (floating)
- MEASUREMENTS: Requires AI_ANALYSIS complete
- ASSESSMENT: Requires AI_ANALYSIS complete
- REPORT: Requires ASSESSMENT + Patient ID
- FINALIZE: Requires REPORT complete
```

---

## API Design

### sessionStorage.ts
```typescript
// Pure localStorage operations - no business logic
export const sessionStorage = {
  getSession(id: string): WorkflowSession | null;
  getAllSessions(): WorkflowSession[];
  saveSession(session: WorkflowSession): void;
  deleteSession(id: string): void;
  getCurrentSessionId(): string | null;
  setCurrentSessionId(id: string): void;
  clearCurrentSession(): void;
};
```

### workflowEngine.ts
```typescript
// Pure functions - no side effects
export function isStepComplete(session: WorkflowSession, step: WorkflowStep): boolean;
export function canNavigateToStep(session: WorkflowSession, step: WorkflowStep): boolean;
export function getStepState(session: WorkflowSession, step: WorkflowStep): StepState;
export function getVisibleSteps(mode: WorkflowMode): StepConfig[];
export function getCompletionPercentage(session: WorkflowSession): number;
export function validateNavigation(session: WorkflowSession, targetStep: WorkflowStep): ValidationResult;
```

### useWorkflow.ts
```typescript
// React hook combining state + persistence
export function useWorkflow() {
  return {
    // State
    session: WorkflowSession | null;
    isLoading: boolean;
    error: string | null;
    
    // Actions
    createSession(mode: WorkflowMode): WorkflowSession;
    updateSession(updates: Partial<WorkflowSession>): void;
    navigateToStep(step: WorkflowStep): boolean;
    deleteSession(): void;
    
    // Computed (derived on every call)
    isStepComplete(step: WorkflowStep): boolean;
    canNavigateToStep(step: WorkflowStep): boolean;
    getStepState(step: WorkflowStep): StepState;
    completionPercentage: number;
  };
}
```

---

## Test Plan

### Phase 1: sessionStorage.ts
- [ ] saveSession stores to localStorage
- [ ] getSession retrieves from localStorage
- [ ] Session data persists across "page reloads"
- [ ] getAllSessions returns array
- [ ] deleteSession removes session
- [ ] currentSessionId management works

### Phase 2: workflowEngine.ts
- [ ] isStepComplete returns correct values for each step
- [ ] canNavigateToStep enforces prerequisites
- [ ] getStepState priority: current > completed > available > locked
- [ ] getVisibleSteps returns correct steps per mode
- [ ] getCompletionPercentage calculates correctly

### Phase 3: useWorkflow.ts
- [ ] createSession initializes and persists
- [ ] updateSession updates state AND localStorage immediately
- [ ] navigateToStep validates and updates currentStep
- [ ] Session restored on hook mount

### Phase 4: WorkflowStepper.tsx
- [ ] Renders correct number of steps per mode
- [ ] Step colors match state
- [ ] Click on available step navigates
- [ ] Click on locked step shows error
- [ ] Progress bar shows correct percentage

---

## Bug Prevention Checklist

| Bug ID | Description | Prevention Strategy |
|--------|-------------|---------------------|
| #1 | Data not persisted | `updateSession()` calls `saveSession()` immediately |
| #2 | Step priority wrong | Check current FIRST in `getStepState()` |
| #3 | currentStep stuck | `navigateToStep()` validates then persists atomically |
| #4 | Mode from localStorage | Explicit mode parameter, no fallback to stored |
| #5 | AI_ANALYSIS locked | `canNavigateToStep` checks actual data |
| #6 | Repair logic fails | No repair needed - derived state always correct |

---

## Implementation Order (TDD)

1. **types.ts** - Define all interfaces
2. **constants.ts** - Step configurations
3. **sessionStorage.test.ts** → **sessionStorage.ts**
4. **workflowEngine.test.ts** → **workflowEngine.ts**
5. **useWorkflow.test.tsx** → **useWorkflow.ts**
6. **WorkflowStepper.test.tsx** → **WorkflowStepper.tsx**
7. **Integration test** - Full workflow simulation

Each step: RED → GREEN → REFACTOR
