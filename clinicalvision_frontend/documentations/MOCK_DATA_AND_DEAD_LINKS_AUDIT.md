# ClinicalVision — Mock Data & Dead Links Audit

**Date:** February 26, 2026  
**Scope:** Full frontend source (`src/`) — excludes `__tests__/`, `*.test.tsx`, `_deprecated/`  
**Baseline:** 77 test suites, 2,220 tests passing

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Section A — Mock / Hardcoded Data in Production UI](#section-a--mock--hardcoded-data-in-production-ui)
3. [Section B — Dead / Inactive Links, Buttons & CTAs](#section-b--dead--inactive-links-buttons--ctas)
4. [Section C — Missing Navigation Items](#section-c--missing-navigation-items)
5. [Section D — Orphaned / Unreachable Pages](#section-d--orphaned--unreachable-pages)
6. [Section E — Missing Static Assets](#section-e--missing-static-assets)
7. [Severity Legend](#severity-legend)
8. [Recommended Prioritization](#recommended-prioritization)

---

## Executive Summary

| Category | 🔴 HIGH | 🟡 MEDIUM | 🟢 LOW | Total |
|----------|---------|-----------|--------|-------|
| Mock / Hardcoded Data | 3 | 5 | 3 | 11 |
| Dead Links / Buttons / CTAs | 3 | 6 | 2 | 11 |
| Missing Nav Items | 1 | 1 | 0 | 2 |
| Orphaned Pages | 1 | 1 | 0 | 2 |
| Missing Assets | 1 | 1 | 0 | 2 |
| **TOTAL** | **9** | **14** | **5** | **28** |

---

## Section A — Mock / Hardcoded Data in Production UI

### A1 🔴 HIGH — DiagnosticViewer.tsx: Entire page uses mock data

**File:** `src/pages/DiagnosticViewer.tsx`  
**Lines:** 26–94, 110–120

The entire `DiagnosticViewer` page is a demo harness. It:

- Creates fake mammogram images via canvas (`createPlaceholderImage` at line 29)
- Uses `Math.random()` to generate fake AI risk scores (lines 45–47, 112–117)
- Creates mock heatmap data from hard-coded gradients (lines 75–90)
- Has a prominent **"Load Demo Data"** button that populates the viewer with fake data
- On file upload, generates **random AI results** via `setTimeout` instead of calling the real inference API (lines 108–122)

```
const mockResults = {
  rccRmlo: {
    score: Math.floor(Math.random() * 100),
    level: (Math.random() > 0.7 ? 'high' : ...) as 'low' | 'medium' | 'high'
  },
  ...
};
```

**Impact:** Users navigating to `/diagnostic-viewer` see entirely fabricated AI analysis results. Even when real images are uploaded, the AI scores shown are random numbers — not from the inference API.

---

### A2 🔴 HIGH — LandingPage.tsx: Fabricated testimonials and doctor names

**File:** `src/pages/LandingPage.tsx`  
**Lines:** 2508–2568, 2600–2670

Two testimonials are rendered with fabricated identities:

| Name | Title | Quote |
|------|-------|-------|
| Dr. Elena Rodriguez, MD, FACR | Director of Breast Imaging, University Medical Center | "For the first time, I can see exactly why the AI flagged a region..." |
| Dr. Michael Okonkwo, MD | Head of Radiology, Regional Health Network | (second testimonial) |

These are hardcoded strings — not from a CMS, database, or API. They appear as real physician endorsements on the public landing page.

**Impact:** Presents fictitious medical professional endorsements to potential users/customers.

---

### A3 🔴 HIGH — CareersPage.tsx: Fabricated employee testimonials & job openings

**File:** `src/pages/CareersPage.tsx`  
**Lines:** 48–80 (openings), 55–76 (testimonials), 85 (partners)

| Category | Data |
|----------|------|
| **Job Openings** | 6 hardcoded roles (Senior ML Engineer, Clinical PM, etc.) — not from an API or ATS |
| **Employee Testimonials** | 3 fake employees: "Dr. Maya Johnson" (ML Researcher), "Alex Chen" (Principal Engineer), "Sarah Park" (Staff SWE) |
| **Partner Hospitals** | Hardcoded list including Stanford Health, Mayo Clinic, Johns Hopkins, Cleveland Clinic, etc. |
| **Benefits** | $3,000 learning budget, remote flexibility — hardcoded |

**Impact:** Presents fabricated team members, real hospital names as "partners", and job openings that aren't connected to any real application system.

---

### A4 🟡 MEDIUM — BlogPage.tsx: Hardcoded blog posts with no backend

**File:** `src/pages/BlogPage.tsx`  
**Lines:** 7–62

Seven blog post objects are hardcoded directly in the component:

- "How AI is Transforming Breast Cancer Screening: A 2024 Outlook"
- "Understanding BI-RADS Categories: A Clinician's Guide"
- "ClinicalVision Achieves 97.5% Sensitivity in Multi-Center Study"
- etc.

These include fabricated dates (January 2024, December 2023), read times, and categories. The "Read More" links on blog cards **don't navigate anywhere** (no `onClick` or `href`).

**Impact:** Blog page displays static content that appears stale (2023/2024 dates). Posts cannot be opened.

---

### A5 🟡 MEDIUM — ContactPage.tsx: Form submits to console.log only

**File:** `src/pages/ContactPage.tsx`  
**Line:** 66

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  console.log('Form submitted:', formData);
};
```

The contact form collects name, email, company, subject, and message — but the submit handler only logs to console. No API call, no email, no feedback to the user.

**Impact:** User fills out a form and gets no confirmation, no error, and no action taken. Data is silently discarded.

---

### A6 🟡 MEDIUM — DemoPage.tsx: Demo request form submits nowhere

**File:** `src/pages/DemoPage.tsx`  
**Lines:** 49–51

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitted(true);
};
```

The demo request form collects first name, last name, email, phone, company, role, practice size, and message. The submit handler sets `submitted = true` (showing a "Thank You" page) but **never sends the data anywhere**. All form data is lost.

**Impact:** Potential customer lead data is silently discarded. User sees "Thank You" but nothing was submitted.

---

### A7 🟡 MEDIUM — ContactPage.tsx: Hardcoded FAQ with unverifiable claims

**File:** `src/pages/ContactPage.tsx`  
**Lines:** 42–52

```
'Yes, ClinicalVision has received FDA 510(k) clearance and CE Mark certification under EU MDR.'
```

Regulatory claims (FDA clearance, CE Mark) are hardcoded in FAQ content. This is marketing/legal copy that should be managed centrally and verified for accuracy.

---

### A8 🟡 MEDIUM — DocumentationPage.tsx: Hardcoded guide content

**File:** `src/pages/DocumentationPage.tsx`  
**Lines:** 17–76

Six documentation sections are hardcoded with titles and descriptions (Quick Start, API Reference, DICOM Integration, etc.). The "Get Started" buttons on documentation cards **have no onClick handler** — they don't navigate to actual documentation.

---

### A9 🟢 LOW — LandingPage.tsx: Hardcoded statistics

**File:** `src/pages/LandingPage.tsx`

Statistics shown in the hero/features sections (e.g., accuracy percentages, number of institutions) are hardcoded in JSX. This is acceptable for a marketing landing page but should ideally be sourced from configuration.

---

### A10 🟢 LOW — PricingPage.tsx: Hardcoded pricing tiers

**File:** `src/pages/PricingPage.tsx`

Pricing plans and feature lists are static data in the component. Acceptable for an early-stage product but should eventually be API-driven.

---

### A11 🟢 LOW — SupportPage.tsx: Hardcoded FAQ & support channels

**File:** `src/pages/SupportPage.tsx`  
**Lines:** 14–42, 44–90

Support channels (Live Chat, Email, Phone, Training) and FAQs are hardcoded. None of the action buttons ("Start Chat", "Send Email", "Call Now", "Book Session") are functional.

---

## Section B — Dead / Inactive Links, Buttons & CTAs

### B1 🔴 HIGH — LandingPage CTA: "Request Demo" button — no onClick

**File:** `src/pages/LandingPage.tsx`  
**Line:** 3248

The "Request Demo" button in the final CTA section has **no `onClick` handler**. It renders as a styled `<Button>` but clicking it does absolutely nothing.

```tsx
<Button variant="contained" size="large" sx={{...}}>
  Request Demo
</Button>
```

---

### B2 🔴 HIGH — LandingPage CTA: "Schedule Consultation" button — no onClick

**File:** `src/pages/LandingPage.tsx`  
**Line:** 3272

Same issue — the "Schedule Consultation" button in the CTA section has no `onClick` handler. Dead button on the most prominent conversion area of the landing page.

---

### B3 🔴 HIGH — BlogPage: "Read More" links — no navigation

**File:** `src/pages/BlogPage.tsx`  
**Line:** 217

Blog post cards show "Read More" with an arrow icon but it's just a styled `<Typography>` with no click handler or link. Blog posts cannot be opened.

---

### B4 🟡 MEDIUM — CareersPage: "Apply Now" buttons — no onClick

**File:** `src/pages/CareersPage.tsx`  
**Line:** 285

Each job listing has an "Apply Now" `<Button>` with no `onClick` handler. Users cannot apply to any position.

---

### B5 🟡 MEDIUM — CareersPage: "View all roles" link — no onClick

**File:** `src/pages/CareersPage.tsx`  
**Line:** 300

The "View all roles" button at the bottom of the openings section has no `onClick` handler. Dead link.

---

### B6 🟡 MEDIUM — SupportPage: Action buttons — no onClick

**File:** `src/pages/SupportPage.tsx`  
**Lines:** 211–229

Four support channel buttons ("Start Chat", "Send Email", "Call Now", "Book Session") are rendered with no `onClick` handlers. Users see professional support options they cannot use.

---

### B7 🟡 MEDIUM — BlogPage: Category filter tabs — no functionality

**File:** `src/pages/BlogPage.tsx`  
**Lines:** 97–110

Category filter buttons (All, Industry Insights, Clinical Education, etc.) are rendered but **have no `onClick` handler and no state management**. Only "All" appears selected (hardcoded via `idx === 0`). Clicking other categories does nothing.

---

### B8 🟡 MEDIUM — DocumentationPage: Guide cards — no navigation

**File:** `src/pages/DocumentationPage.tsx`

Documentation guide cards (Quick Start, API Reference, etc.) are clickable-styled but none navigate to actual documentation content. No individual doc pages exist.

---

### B9 🟡 MEDIUM — ContextualHelp: "Learn More" link to /docs/confidence — 404

**File:** `src/components/shared/ContextualHelp.tsx`  
**Line:** 71

```tsx
learnMoreUrl: '/docs/confidence',
```

This renders as `<a href="/docs/confidence">` but the route `/docs/confidence` does not exist in routeConfig. Clicking it navigates to a 404.

---

### B10 🟢 LOW — DiagnosticViewer: "Upload Your Images" — generates random results

**File:** `src/pages/DiagnosticViewer.tsx`  
**Lines:** 108–122

The upload button works functionally (accepts files) but the "AI analysis" after upload generates random numbers via `Math.random()` instead of calling the inference API. This is the same page covered in A1 but specifically the upload CTA misleads users.

---

### B11 🟢 LOW — ReportPreview: "Download PDF" link — conditional, may reference invalid URL

**File:** `src/components/workflow/ReportPreview.tsx`  
**Line:** 653

```tsx
<Link href={report.pdfUrl} target="_blank" rel="noopener noreferrer">
```

Only rendered when `report.pdfUrl` is set. If the URL is a local blob URL from a previous session, it will be invalid after reload. Low severity since it's conditional and rare.

---

## Section C — Missing Navigation Items

### C1 🔴 HIGH — Cases Dashboard (`/cases`) not in active sidebar

**File:** `src/components/layout/ModernMainLayout.tsx` (the active layout used by `AppRoutes.tsx`)

The `CasesDashboard` page is registered in `routeConfig.tsx` at path `/cases` but is **NOT listed in the `ModernMainLayout` navigation sidebar**. Users have no way to navigate to the Cases page from the sidebar. It only appears in:

- The old `MainLayout.tsx` (not used in production)
- `CommandPalette.tsx` (keyboard shortcut only)
- `GlobalSearchBar.tsx` (search only)

**Impact:** An entire protected page (`/cases`) with full functionality is unreachable from primary navigation.

---

### C2 🟡 MEDIUM — Analysis Suite (`/analysis-suite`) not in sidebar

**File:** `src/components/layout/ModernMainLayout.tsx`

The `ImageAnalysisPage` at `/analysis-suite` exists in `routeConfig.tsx` but has **no sidebar entry**. It's only reachable from the `DiagnosticWorkstation` "Continue" button, which is itself an orphaned page (see D1).

---

## Section D — Orphaned / Unreachable Pages

### D1 🔴 HIGH — DiagnosticWorkstation.tsx: Page exists but has no route

**File:** `src/pages/DiagnosticWorkstation.tsx` (936 lines)

A fully implemented page component (`DiagnosticWorkstation`) exists at `src/pages/DiagnosticWorkstation.tsx` but is **not imported by `routeConfig.tsx`** and has **no route entry**. It was previously accessible via `/diagnostic-workstation` which now redirects to `/workflow` via `LEGACY_REDIRECTS`.

The page is effectively dead code. It has its own test file (`__tests__/pages/DiagnosticWorkstation.test.tsx`) that still runs. There's also a copy in `_deprecated/pages/`.

---

### D2 🟡 MEDIUM — PlaceholderStep component: Defined but never used

**File:** `src/pages/ClinicalWorkflowPageV2.tsx`  
**Lines:** 141–230

```tsx
// PLACEHOLDER COMPONENT — Temporary for Phase D steps
const PlaceholderStep: React.FC<PlaceholderStepProps> = ({ config, onBack, onContinue }) => {
```

This component was built as a temporary placeholder for workflow steps not yet implemented. It is **defined but never referenced** anywhere — pure dead code (confirmed via usage analysis: 0 call sites).

---

## Section E — Missing Static Assets

### E1 🔴 HIGH — Missing image files referenced by LandingPage

**File:** `src/pages/LandingPage.tsx`  
**Lines:** 3005, 3012, 3019

Three news article images are referenced but **do not exist** in `public/images/`:

| Referenced Path | Exists? |
|-----------------|---------|
| `/images/news-screening.jpg` | ❌ No |
| `/images/news-oncology.jpg` | ❌ No |
| `/images/news-research.jpg` | ❌ No |

Only `clinicalvision-logo.svg` and `clinicalvision-icon.svg` exist in `public/images/`.

**Impact:** News section cards render with broken image placeholders.

---

### E2 🟡 MEDIUM — Missing blog featured image

**File:** `src/pages/BlogPage.tsx`  
**Line:** 13

```tsx
image: '/blog/featured.jpg',
```

The `public/blog/` directory does not exist. The featured post image will show a broken image or fallback.

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 **HIGH** | Actively misleads users, shows fake data as real, or blocks critical user actions |
| 🟡 **MEDIUM** | Non-functional UI element or static content that should be dynamic; user impact is limited |
| 🟢 **LOW** | Acceptable defaults or edge cases; minimal user-facing impact |

---

## Recommended Prioritization

### Immediate (P0)

| ID | Issue | Fix |
|----|-------|-----|
| A1 | DiagnosticViewer uses random/mock data | Connect to real inference API or gate behind a "demo" badge |
| B1 | "Request Demo" CTA — dead button | Add `onClick={() => navigate(ROUTES.DEMO)}` |
| B2 | "Schedule Consultation" CTA — dead button | Add `onClick={() => navigate(ROUTES.CONTACT)}` |
| C1 | `/cases` page unreachable from sidebar | Add Cases item to `ModernMainLayout` navigation sections |

### Short-Term (P1)

| ID | Issue | Fix |
|----|-------|-----|
| A2 | Fabricated doctor testimonials | Replace with real testimonials or mark as illustrative |
| A3 | Fabricated employees/partners | Add disclaimer or source from real data |
| A5 | Contact form → console.log | Connect to backend email/CRM endpoint |
| A6 | Demo form → nowhere | Connect to lead capture API |
| B3 | Blog "Read More" dead | Add individual blog post pages or link to external posts |
| E1 | Missing news images | Add placeholder images or remove news section |

### Medium-Term (P2)

| ID | Issue | Fix |
|----|-------|-----|
| A4 | Static blog content | Build CMS integration or API-driven blog |
| A7 | Hardcoded FDA/CE claims | Centralize regulatory text in config |
| B4-B6 | Dead career/support buttons | Wire to real ATS/support integrations |
| B7 | Blog category filter — no-op | Implement filter state management |
| B9 | `/docs/confidence` → 404 | Create docs page or remove link |
| C2 | `/analysis-suite` not in sidebar | Evaluate if page is needed; add or remove |
| D1 | Orphaned DiagnosticWorkstation | Delete file and its test, or restore route |
| D2 | Unused PlaceholderStep | Delete dead code |
| E2 | Missing blog featured image | Add image or remove reference |

---

*Generated by automated audit — February 26, 2026*
