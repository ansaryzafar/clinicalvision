# ClinicalVision — Bug Fix Implementation Plan (TDD)

**Date:** 2026-02-26  
**Baseline:** 76 suites, 2,200 tests, 0 failures

---

## Executive Summary

Three categories of bugs were discovered during live testing audit:

| # | Category | Severity | Root Cause |
|---|----------|----------|------------|
| **B1** | Dead-end after Generate Report | 🔴 Critical | ReportPreview has no "Continue" button; FinalizeStep calls `finalizeCase` which requires DIGITAL_SIGNATURE step; DigitalSignatureStep never finalizes/locks the case |
| **B2** | Stale case on archive reopen | 🔴 Critical | `currentCase` persists in ClinicalCaseContext across navigations; archive page never calls `clearCurrentCase`; ClinicalWorkflowPageV2 never reads route params |
| **B3** | Font / color / style inconsistency | 🟡 Medium | 5 components use wrong or missing LUNIT design tokens; 2 components have zero LUNIT styling; wrong token values in ClinicalWorkflowPageV2 |

---

## B1: Dead-End After Generate Report (Critical)

### Root Cause Analysis

The 10-step workflow ends with three steps: REPORT_GENERATION (7) → FINALIZE (8) → DIGITAL_SIGNATURE (9). All three have bugs that create dead-ends:

| Step | Component | Bug |
|------|-----------|-----|
| 7 — REPORT_GENERATION | `ReportPreview.tsx` | **No "Continue" or "Next Step" button.** User can finalize report (changes status to `pending_review`) but cannot advance to step 8. The `onFinalize` prop only changes report status, not workflow step. |
| 8 — FINALIZE | `FinalizeStep.tsx` | **"Lock Case" calls `finalizeCase()` which requires step 9.** The `finalizeCase` pure function checks `currentStep !== DIGITAL_SIGNATURE` and always fails at step 8. Also, **no "Continue to Signature" button** — only Back and Lock Case. |
| 9 — DIGITAL_SIGNATURE | `DigitalSignatureStep.tsx` | **`signReport()` never calls `finalizeCase()`.** After signing, report status changes to `signed` but the case is never locked, workflow status never becomes `finalized`, and `isLocked` stays `false`. |

### Fix Design

1. **ReportPreview**: Add `onContinue?: () => void` prop. Render a "Continue to Final Review →" button after the report exists (visible when `report.status !== 'draft'`).

2. **ClinicalWorkflowPageV2**: Pass `onContinue={handleAdvance}` to `<ReportPreview>`.

3. **FinalizeStep**: Replace "Lock Case" with "Continue to Digital Signature →" that calls `advanceWorkflow()`. The case-locking responsibility moves to DigitalSignatureStep (step 9 is where the radiologist signs and locks).

4. **DigitalSignatureStep**: After `signReport(hash)` succeeds, call `finalizeCase(hash)` to lock the case, set `workflow.status = 'finalized'`, and complete the workflow.

### TDD Steps

#### B1-RED (4 new tests)

| Test | File | Assertion |
|------|------|-----------|
| `ReportPreview should render Continue button when report exists` | `ReportPreview.test.tsx` | Button with name `/continue/i` visible when `report` is present |
| `ReportPreview should call onContinue when Continue clicked` | `ReportPreview.test.tsx` | `onContinue` mock called once |
| `FinalizeStep should render Continue to Signature button` | `FinalizeStep.test.tsx` | Button with `/continue|signature/i` visible, no "Lock Case" |
| `DigitalSignatureStep should finalize case after signing` | `DigitalSignatureStep.test.tsx` | After sign flow, `finalizeCase` mock is called |

#### B1-GREEN (4 file edits)

1. `ReportPreview.tsx` — Add `onContinue` prop + button
2. `ClinicalWorkflowPageV2.tsx` — Pass `onContinue={handleAdvance}` to ReportPreview
3. `FinalizeStep.tsx` — Replace "Lock Case" with "Continue to Digital Signature →" using `advanceWorkflow()`
4. `DigitalSignatureStep.tsx` — After `signReport` success, call `finalizeCase`

---

## B2: Stale Case on Archive Reopen (Critical)

### Root Cause Analysis

Three compounding bugs:

1. **`currentCase` persists across navigations** — ClinicalCaseContext wraps the entire app. When user works on Case A (8/10 steps), then navigates to archive and clicks Case B, `currentCase` is still Case A.

2. **AnalysisArchive passes router state, but nobody reads it** — `handleViewInWorkstation` sends `{ patientId, imageFileName, fromArchive }` via `navigate(ROUTES.WORKFLOW, { state })`, but ClinicalWorkflowPageV2 has no `useLocation()` and never reads the state.

3. **ClinicalWorkflowPageV2 has no cleanup** — No `useEffect` cleanup to call `clearCurrentCase` on unmount, so stale data persists indefinitely.

### Fix Design

1. **ClinicalWorkflowPageV2**: Add a `useEffect` that reads `location.state?.fromArchive`. If `fromArchive === true`, call `clearCurrentCase()` on mount so the user starts fresh (archive data is from the legacy system, not `ClinicalCaseContext`).

2. **ClinicalWorkflowPageV2**: Add a cleanup `useEffect` that calls `clearCurrentCase()` on unmount, preventing stale data from lingering when navigating away.

3. **Optional enhancement**: Add a "Start New Case" banner when arriving from archive, since the archive system uses `SavedAnalysis` (legacy) which can't be directly loaded into `ClinicalCaseContext`.

### TDD Steps

#### B2-RED (3 new tests)

| Test | File | Assertion |
|------|------|-----------|
| `should call clearCurrentCase when navigating from archive` | `ClinicalWorkflowPageV2.test.tsx` | Mock `useLocation` with `state.fromArchive: true` → `clearCurrentCase` called |
| `should call clearCurrentCase on unmount` | `ClinicalWorkflowPageV2.test.tsx` | After `unmount()`, `clearCurrentCase` was called |
| `should NOT clear case on normal mount` | `ClinicalWorkflowPageV2.test.tsx` | Without `fromArchive`, `clearCurrentCase` not called on mount |

#### B2-GREEN (1 file edit)

1. `ClinicalWorkflowPageV2.tsx` — Add `useLocation`, `useEffect` for archive detection + cleanup on unmount

---

## B3: Font / Color / Style Inconsistency (Medium)

### Audit Results

| Component | LUNIT obj? | Fonts applied? | Colors correct? | `textTransform: 'none'`? | Fix needed? |
|-----------|:-:|:-:|:-:|:-:|:-:|
| ImageVerificationStep | ✅ | ✅ | ✅ | ✅ | — |
| FinalizeStep | ✅ | ✅ | ✅ | ✅ | — |
| DigitalSignatureStep | ✅ | ✅ | ✅ | ✅ | — |
| BatchAnalysisRunner | ✅ | ✅ | ✅ | ✅ | — |
| WorkflowAnalysisSuite | ✅ | ✅ | ⚠️ | ✅ | Low: 3 hardcoded amber `#F59E0B` |
| PatientInfoStep | ✅ def'd | ❌ not applied | ✅ | ❌ | **YES** — fonts defined but never used in JSX |
| ClinicalHistoryStep | ✅ def'd | ❌ not applied | ✅ | ❌ | **YES** — fonts defined but never used in JSX |
| ReportPreview | ✅ | ✅ | ✅ | ❌ 3× `uppercase` | **YES** — remove `uppercase` |
| **BiRadsAssessmentStep** | ❌ | ❌ | ❌ | ❌ | **YES** — zero LUNIT styling |
| **MultiImageUpload** | ❌ | ❌ | ❌ | ❌ | **YES** — zero LUNIT styling |
| **ClinicalWorkflowPageV2** | ✅ wrong values | ✅ | ❌ | ❌ 2× `uppercase` | **YES** — wrong token values |

### Canonical LUNIT Tokens (source of truth)

```typescript
const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  tealDark: '#0F95AB',
  darkGray: '#1A1A2E',
  midGray: '#6B7280',
  lightGray: '#E5E7EB',
  green: '#22C55E',
  white: '#FFFFFF',
  black: '#151515',
  lightest: '#EFF0F4',
};
```

### Fix Design

#### Priority 1 — Wrong token values (visual mismatch on every page visit)

**ClinicalWorkflowPageV2.tsx** — Fix 5 wrong color values:
- `darkGray: '#233232'` → `'#1A1A2E'`
- `midGray: '#5C6A6B'` → `'#6B7280'`
- `lightGray: '#9CA3AF'` → `'#E5E7EB'`
- `green: '#56C14D'` → `'#22C55E'`
- `fontHeading` fallback: `"Poppins"` → `"Inter"`

Remove 2× `textTransform: 'uppercase'` (lines 832, 973).

#### Priority 2 — Components with no LUNIT styling

**BiRadsAssessmentStep.tsx** — Add LUNIT token object, apply `fontFamily: LUNIT.fontHeading` to headings, `fontFamily: LUNIT.fontBody` to body, `textTransform: 'none'` to buttons.

**MultiImageUpload.tsx** — Add LUNIT token object, apply fonts and colors to headings, body text, and buttons.

#### Priority 3 — Fonts defined but not applied in JSX

**PatientInfoStep.tsx** — Add `fontFamily: LUNIT.fontHeading` to the h5 heading, `fontFamily: LUNIT.fontBody` to body text and buttons, `textTransform: 'none'` to buttons.

**ClinicalHistoryStep.tsx** — Same treatment as PatientInfoStep.

#### Priority 4 — Remove uppercase violations

**ReportPreview.tsx** — Remove `textTransform: 'uppercase'` from lines 162, 495, 538.

### TDD Steps

#### B3-RED (3 new tests)

| Test | File | Assertion |
|------|------|-----------|
| `ClinicalWorkflowPageV2 phase labels should not use uppercase` | `ClinicalWorkflowPageV2.test.tsx` | No element with `textTransform: 'uppercase'` in phase labels |
| `BiRadsAssessmentStep heading should use ClashGrotesk font` | `BiRadsAssessmentStep.test.tsx` | Heading element has `fontFamily` containing `ClashGrotesk` |
| `PatientInfoStep heading should use ClashGrotesk font` | existing test file or new | Heading has `fontFamily` containing `ClashGrotesk` |

#### B3-GREEN (6 file edits)

1. `ClinicalWorkflowPageV2.tsx` — Fix 5 wrong token values, remove 2 `uppercase`
2. `BiRadsAssessmentStep.tsx` — Add LUNIT tokens, apply fonts
3. `MultiImageUpload.tsx` — Add LUNIT tokens, apply fonts
4. `PatientInfoStep.tsx` — Apply `fontFamily` to heading and body
5. `ClinicalHistoryStep.tsx` — Apply `fontFamily` to heading and body
6. `ReportPreview.tsx` — Remove 3× `uppercase`

---

## Implementation Order

| Phase | Step | Tests added | Files changed |
|-------|------|-------------|---------------|
| 1 | B1-RED: Write dead-end workflow tests | 4 | 3 test files |
| 2 | B1-GREEN: Fix workflow navigation | 0 | 4 source files |
| 3 | B2-RED: Write stale state tests | 3 | 1 test file |
| 4 | B2-GREEN: Fix case cleanup | 0 | 1 source file |
| 5 | B3-RED: Write styling consistency tests | 3 | 2 test files |
| 6 | B3-GREEN: Fix all styling mismatches | 0 | 6 source files |
| 7 | Full regression | 0 | 0 |

**Expected final count:** 76+ suites, 2,210+ tests, 0 failures

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| `finalizeCase` called from wrong step | Fix requires DigitalSignatureStep to call it after sign, which is now at step 9 (correct) |
| Cleanup `useEffect` clears case on hot reload | Use a `ref` to track if cleanup is intentional navigation vs HMR |
| BiRads styling changes break existing tests | Run BiRads test suite after each change |
| ReportPreview `onContinue` breaks existing test assertions | Check existing ReportPreview tests first |
