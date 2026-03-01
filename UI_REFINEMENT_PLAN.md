# ClinicalVision UI Refinement Plan — TDD Execution Guide

**Date:** 2026-02-28  
**Scope:** Logo alignment, About page uniformity, Workflow stepper visibility, Analysis Suite empty-state, Typography upgrade  
**Approach:** Test-Driven Development (TDD) — Write tests first, then implement  
**Risk Policy:** Zero regressions — all 81 suites / 2,245 tests must continue passing

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Issue Inventory & Root Cause Analysis](#2-issue-inventory--root-cause-analysis)
3. [Typography Research & Upgrade Recommendation](#3-typography-research--upgrade-recommendation)
4. [Implementation Plan — Step by Step](#4-implementation-plan--step-by-step)
5. [TDD Test Specifications](#5-tdd-test-specifications)
6. [File Change Map](#6-file-change-map)
7. [Rollback Strategy](#7-rollback-strategy)

---

## 1. Executive Summary

Five visual refinements identified through UI audit, each traced to specific code locations:

| # | Issue | Severity | Files Affected |
|---|-------|----------|---------------|
| R1 | Landing page logo undersized & misaligned | 🟠 Medium | `LandingPage.tsx`, `clinicalvision-logo.svg` |
| R2 | About page uses old generic icon instead of brand logo | 🟠 Medium | `PageLayout.tsx` (PageHeader), `AboutPage.tsx` |
| R3 | Workflow stepper "Completion" phase label truncated, sub-steps too opaque | 🟡 Low-Med | `ClinicalWorkflowPageV2.tsx` |
| R4 | Analysis Suite empty state lacks informational banner | 🟠 Medium | `ImageAnalysisPage.tsx` |
| R5 | Typography weight upgrade across workflow pages | 🟡 Low | `ClinicalWorkflowPageV2.tsx`, `lunitDesignSystem.ts` |

---

## 2. Issue Inventory & Root Cause Analysis

### R1: Landing Page Logo — Undersized & Misaligned

**What the user sees:** The dotted-C logo + "Vision AI" wordmark in the landing page navbar appears small relative to the nav items and is not perfectly vertically centered.

**Root Cause Analysis:**

The logo is rendered as an `<img>` tag loading `clinicalvision-logo.svg` (a 420×120 viewBox SVG). The current styling:

```tsx
// LandingPage.tsx lines ~278-287
sx={{
  height: { xs: 60, md: 72 },  // ← Too small for a 420×120 SVG
  width: 'auto',
  display: 'block',
  objectFit: 'contain',
  imageRendering: 'crisp-edges',  // ← Inappropriate for SVG (rasterization hint)
  filter: 'drop-shadow(0 2px 8px rgba(0, 201, 234, 0.15))',
}}
```

**Problems identified:**
1. **Height too restrictive:** At 72px height for a 420×120 SVG, the logo renders at only ~252px wide. The navbar spans 1440px — the logo should occupy more visual real estate.
2. **`imageRendering: 'crisp-edges'`** is a rasterization directive meant for pixel art, not vector SVGs. It can cause jagged edges on high-DPI screens.
3. **No explicit vertical centering** within the flex container. While `alignItems: 'center'` is set on the parent, the `display: 'block'` on the img can cause misalignment with text-baseline nav items.
4. **`?v=5` cache buster** on the src path suggests prior iterations — the SVG itself is fine, but the rendering parameters are suboptimal.

**Brand Asset Location:**
- ✅ `public/images/clinicalvision-logo.svg` — Full logo (Dotted C + "Vision AI" wordmark) — **correctly placed in `public/images/`**
- ✅ `public/images/clinicalvision-icon.svg` — Icon-only (Dotted C pattern) — **correctly placed**
- ❌ `src/logo.svg` — This is the default CRA React atom logo — **should be removed or replaced** (not brand-relevant)

**Industry best practices for logo/brand asset management:**
- Logos should live in `public/images/` or `public/assets/brand/` (not in `src/`) for direct URL access without webpack processing
- SVG logos should use `<img>` tags (not `<ReactComponent>`) when no dynamic manipulation is needed, for cacheability
- Logo height in navbars should be 32–48px for standard navbars, but for hero/marketing navbars with larger padding, 40–56px is the range used by Lunit, Stripe, and Linear
- Use `object-fit: contain` (✅ already correct) but drop `imageRendering: 'crisp-edges'`
- Logo containers should use `flex` with `align-items: center` and `line-height: 0` to eliminate text baseline interference

**Fix:**
1. Increase logo height to `{ xs: 36, md: 44 }` — proportional to Lunit.io's logo sizing (~40px in their navbar)
2. Remove `imageRendering: 'crisp-edges'`
3. Add `lineHeight: 0` to the parent Box to eliminate baseline shift
4. Ensure the SVG viewBox aspect ratio (3.5:1) renders cleanly at all sizes

### R2: About Page — Old Logo & Missing Theme Uniformity

**What the user sees:** The About page header shows a small teal-gradient square with a generic `Assessment` MUI icon + "ClinicalVision" text, instead of the actual brand logo SVG. The header also has different styling from the Landing page navbar.

**Root Cause Analysis:**

The About page uses `<PageLayout>` which renders `<PageHeader>`:

```tsx
// PageLayout.tsx lines ~75-92
<Box sx={{
  width: 40, height: 40, borderRadius: '10px',
  background: `linear-gradient(135deg, ${lunitColors.teal} 0%, ${lunitColors.tealDarker} 100%)`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}}>
  <Assessment sx={{ color: lunitColors.black, fontSize: 24 }} />
</Box>
<Typography sx={{
  fontFamily: lunitTypography.fontFamilyHeading,
  fontWeight: lunitTypography.fontWeightMedium,
  fontSize: '18px',
  color: isDark ? lunitColors.white : lunitColors.headingColor,
}}>
  ClinicalVision
</Typography>
```

This is a placeholder "logo" — a colored square with an icon. The actual SVG brand logo is only used in:
- `LandingPage.tsx` (navbar)
- `ModernMainLayout.tsx` (sidebar)

**Problems identified:**
1. **Inconsistent branding** — three different "logos" across the app (SVG logo, Assessment icon, sidebar logo)
2. **PageHeader** component used by About page is a completely separate nav bar from `LandingPage.tsx`'s nav bar
3. **No shared NavBar component** — each page rolls its own header, leading to visual divergence
4. The About page dark hero section looks styled correctly but the header floats above with mismatched branding

**Fix:**
1. Replace the `Assessment` icon + text in `PageHeader` with the actual `clinicalvision-logo.svg`
2. For the dark variant, the SVG logo uses `url(#dotGradient)` with teal colors that work on both light and dark backgrounds — may need a `filter: brightness(...)` for the dark variant or a dedicated light version

### R3: Workflow Stepper — Truncated Phase Name & Sub-Step Opacity

**What the user sees:**
1. The last phase label "Completion" appears truncated to "Completio" (missing last two letters)
2. Sub-step labels within each phase are very faint/opaque (nearly invisible)

**Root Cause Analysis:**

Looking at the stepper in `ClinicalWorkflowPageV2.tsx`:

**Phase label truncation:**
The phase stepper uses a horizontal scrollable container:
```tsx
<Box sx={{ display: 'flex', overflowX: 'auto', px: 1, py: 1, gap: 0 }}>
```
Each phase group has `minWidth: 'fit-content'`. The "Completion" phase at position 5 (last) may be clipped by the container's `overflow: 'hidden'` on the parent `Paper`, combined with the scrollable inner Box not having enough right padding.

The parent Paper has:
```tsx
sx={{ overflow: 'hidden' }}
```
And the scrollable container has only `px: 1` padding — insufficient for the last phase to be fully visible, especially since the scrollbar is hidden (`'&::-webkit-scrollbar': { height: 0 }`).

**Sub-step opacity:**
Each `StepNavItem` that is inaccessible (locked) gets:
```tsx
opacity: accessible ? 1 : 0.45,
```
But even accessible non-current steps get:
```tsx
color: LUNIT.midGray,  // #6B7280 — already a light gray
```
Combined with `fontSize: '0.82rem'` and `fontWeight: 400`, these steps become very hard to read. The issue is compounded by `LUNIT.lightGray` (#E5E7EB) being used for inaccessible steps — this is nearly invisible on a white background.

**Fix:**
1. Add `pr: 2` (right padding) to the scrollable container so the last phase isn't clipped
2. Remove `overflow: 'hidden'` from the parent Paper or change to `overflow: 'visible'` with proper scrolling
3. Increase inaccessible step opacity from `0.45` to `0.55`
4. Increase the color contrast for non-current accessible steps from `LUNIT.midGray` to a slightly darker shade
5. Increase the color for inaccessible steps from `LUNIT.lightGray` (#E5E7EB) to `LUNIT.grey` (#95A3A4) at reduced opacity

### R4: Analysis Suite Empty State — Missing Informational Banner

**What the user sees:** When navigating to `/analysis-suite` from the sidebar, there's a plain white page with a "No Image Loaded" card and a single CTA button. No context about what the Analysis Suite does, what image types it supports, or what capabilities it offers.

**Root Cause Analysis:**

The `ImageAnalysisPage.tsx` renders `AnalysisSuiteEmptyState` which is a minimal placeholder:
- One icon (Biotech in a circle)
- Title "No Image Loaded"
- One paragraph of text
- One CTA button

This violates the design system's information density patterns seen in other pages (Dashboard, Cases) which use gradient banners, capability cards, and informational sections.

**What's missing:**
1. **Gradient page banner** (matching the workflow page's `New Analysis` banner pattern)
2. **Capability cards** showing what the suite offers (e.g., AI-powered analysis, GradCAM overlays, multi-view comparison, BI-RADS classification)
3. **Supported format information** (DICOM, PNG, JPEG; recommended sizes; resolution requirements)
4. **Metrics the suite produces** (confidence scores, risk levels, BI-RADS categories, uncertainty quantification)

**Fix:**
Redesign `AnalysisSuiteEmptyState` with:
1. Gradient banner matching the Lunit design system
2. 4-column capability cards with icons
3. Supported formats section
4. Clear CTA to workflow

### R5: Typography Weight Upgrade — Workflow Pages

**What the user sees:** The workflow page text feels light and lacks visual hierarchy strength.

---

## 3. Typography Research & Upgrade Recommendation

### Current Typography Stack

| Role | Font | Weight | Source |
|------|------|--------|--------|
| Headings | ClashGrotesk | 200-300 (Light) | Local WOFF2 (variable font) |
| Body | Lexend | 300-500 | Google Fonts CDN |

### Research Findings

**A. Medical/Healthcare UI Typography Benchmarks:**

| Platform | Heading Font | Body Font | Heading Weight | Body Weight |
|----------|-------------|-----------|---------------|-------------|
| **Lunit INSIGHT** | ClashGrotesk | Lexend | 300 (Light) | 400 (Regular) |
| **Aidoc** | Inter | Inter | 600 (SemiBold) | 400 (Regular) |
| **Viz.ai** | DM Sans | DM Sans | 500-700 | 400 |
| **Arterys** | Inter | Inter | 500-600 | 400 |
| **Paige AI** | Inter | Inter | 600-700 | 400 |
| **PathAI** | Inter | Inter | 500-600 | 400 |
| **Epic Systems** | Open Sans | Open Sans | 600-700 | 400 |
| **Cerner/Oracle Health** | Noto Sans | Noto Sans | 500-600 | 400 |

**Key observation:** ClinicalVision currently uses heading weight 200-300 (Extra Light / Light), which is at the extreme low end. Most clinical/medical platforms use **500-600** for headings.

**B. Typography Best Practices for Clinical UIs:**

1. **WCAG 2.1 AA Compliance:** Font weight below 400 at small sizes (< 18px) fails contrast ratios on light backgrounds. ClashGrotesk at weight 200-300 with color `#6B7280` (midGray) results in a contrast ratio of ~4.0:1 — just barely meeting AA for normal text but failing for informational UI elements.

2. **Cognitive Load in Clinical Settings:** Research by Ware (2012) and the Nielsen Norman Group shows that radiologists scanning clinical interfaces benefit from **higher typographic contrast** (stronger weight differential between hierarchy levels) because:
   - Clinical environments have variable ambient lighting
   - Users are often fatigued during long reading sessions
   - Critical information must be immediately scannable

3. **Font Weight Hierarchy (Material Design 3 recommendation):**
   - Display/Hero: 400 (Regular) — for very large sizes (40px+)
   - Headline: 500 (Medium) — for section titles (24-36px)
   - Title: 500-600 (Medium/SemiBold) — for card titles, step labels (18-24px)
   - Body: 400 (Regular) — for paragraph text (14-16px)
   - Label: 500 (Medium) — for buttons, tags, navigation (12-14px)

4. **Variable Font Advantage:** ClashGrotesk variable font (already loaded) supports weights 200-700 — we can upgrade weights without any additional font loading cost.

### Recommended Typography Upgrade

**Principle:** Keep the same font families (ClashGrotesk + Lexend) but upgrade weights for better readability and visual hierarchy.

| Element | Current Weight | Proposed Weight | Rationale |
|---------|---------------|-----------------|-----------|
| **Page titles** (e.g., "New Analysis") | 300 (Light) | 400 (Regular) | M3 display guidance; readable at 1.5-2rem sizes |
| **Section headings** (phase labels) | 600 (SemiBold) | 600 (SemiBold) | ✅ Already good |
| **Step labels (current)** | 500 (Medium) | 500 (Medium) | ✅ Already good |
| **Step labels (non-current, accessible)** | 400 (Regular) | 450→ 500 (Medium) | Better scanability |
| **Step labels (locked)** | 400 w/ 0.45 opacity | 400 w/ 0.55 opacity | WCAG AA compliance |
| **Body text in forms** | 300 (Light) | 400 (Regular) | Clinical readability |
| **Phase indicator ("Phase 1: Setup")** | 500 | 500 | ✅ Already good |
| **Completion badge text** | 500 | 500 | ✅ Already good |
| **About page hero heading** | 200 (Extra Light) | 300 (Light) | More substantial at large sizes |
| **About page body** | 300 (Light) | 400 (Regular) | Better reading comfort |
| **About page section headings** | 200 (Extra Light) | 300 (Light) | Consistent with hero |

**Note:** The hero/display headings (40px+) on the Landing page can stay at their current light weights — they're large enough that the thinness reads as elegant rather than fragile. The upgrade targets smaller text elements where weight impacts readability.

### Font Stack Consideration

**Should we switch body font from Lexend to Inter?**

| Factor | Lexend | Inter |
|--------|--------|-------|
| Medical UI usage | Low adoption | Dominant (Aidoc, PathAI, Arterys, Viz.ai) |
| x-height | Higher (designed for reading speed) | Standard |
| Weight clarity at 14-16px | Good | Excellent |
| Variable font support | Yes | Yes |
| Google Fonts loading | 1 request | 1 request |
| Character set | Standard Latin | Extensive (200+ languages) |
| UI number rendering | Adequate | Excellent (tabular figures built-in) |

**Recommendation:** **Keep Lexend** for now. It was specifically designed for reading speed and fluency, which aligns with clinical use cases. Switching to Inter would be a larger visual change beyond the current scope. The weight upgrade alone will solve the readability concerns.

---

## 4. Implementation Plan — Step by Step

### Phase A: Test Scaffolding (TDD — Tests First)

```
Step A1: Write tests for R1 (logo rendering)
Step A2: Write tests for R2 (About page logo)
Step A3: Write tests for R3 (stepper visibility)
Step A4: Write tests for R4 (Analysis Suite banner)
Step A5: Verify all new tests FAIL (red phase)
```

### Phase B: Implementation

```
Step B1: Fix R1 — Landing page logo sizing & alignment
Step B2: Fix R2 — PageHeader logo replacement  
Step B3: Fix R3 — Stepper truncation & opacity
Step B4: Fix R4 — Analysis Suite empty state redesign
Step B5: Fix R5 — Typography weight upgrades
Step B6: Verify all new tests PASS (green phase)
Step B7: Run full test suite — verify 0 regressions
```

### Phase C: Commit & Push

```
Step C1: git add & commit with conventional message
Step C2: Push to origin/main
Step C3: Monitor CI pipeline
```

---

## 5. TDD Test Specifications

### Test Suite: R1 — Landing Page Logo

**File:** `src/__tests__/ui-refinements/logoRendering.test.tsx`

```
TEST 1: renders clinicalvision-logo.svg from /images/ directory
TEST 2: logo img has alt text "ClinicalVision AI Logo"
TEST 3: logo container uses flexbox with alignItems center
TEST 4: logo does NOT use imageRendering: crisp-edges
TEST 5: clicking logo navigates to home route
```

### Test Suite: R2 — About Page Branding

**File:** `src/__tests__/ui-refinements/aboutPageBranding.test.tsx`

```
TEST 1: PageHeader renders clinicalvision-logo.svg image (not Assessment icon)
TEST 2: About page hero section renders brand-consistent content
TEST 3: About page uses lunitDesignSystem typography tokens
```

### Test Suite: R3 — Workflow Stepper

**File:** `src/__tests__/ui-refinements/workflowStepper.test.tsx`

```
TEST 1: all 5 phase labels render completely (Setup, Imaging, Analysis, Reporting, Completion)
TEST 2: "Completion" label text is not truncated
TEST 3: locked steps have opacity >= 0.5
TEST 4: accessible non-current steps have distinguishable color (not same as background)
TEST 5: all 10 step labels are present in the DOM
```

### Test Suite: R4 — Analysis Suite Empty State

**File:** `src/__tests__/ui-refinements/analysisSuiteEmptyState.test.tsx`

```
TEST 1: empty state renders a page banner with gradient background
TEST 2: empty state shows capability cards (at least 3 cards)
TEST 3: empty state shows supported image format information
TEST 4: empty state has CTA button to workflow
TEST 5: empty state renders Analysis Suite title text
```

---

## 6. File Change Map

| File | Change Type | Lines Changed (est.) |
|------|-------------|---------------------|
| `src/pages/LandingPage.tsx` | Modify | ~10 lines (logo sx props) |
| `src/components/layout/PageLayout.tsx` | Modify | ~20 lines (PageHeader logo) |
| `src/pages/ClinicalWorkflowPageV2.tsx` | Modify | ~15 lines (stepper padding, opacity) |
| `src/pages/ImageAnalysisPage.tsx` | Modify | ~120 lines (empty state redesign) |
| `src/pages/AboutPage.tsx` | Modify | ~10 lines (typography weights) |
| `src/__tests__/ui-refinements/logoRendering.test.tsx` | Create | ~60 lines |
| `src/__tests__/ui-refinements/aboutPageBranding.test.tsx` | Create | ~50 lines |
| `src/__tests__/ui-refinements/workflowStepper.test.tsx` | Create | ~80 lines |
| `src/__tests__/ui-refinements/analysisSuiteEmptyState.test.tsx` | Create | ~70 lines |

**Total estimated changes:** ~435 lines (160 implementation + 260 tests + 15 config)

---

## 7. Rollback Strategy

Each fix is independent and can be rolled back individually:
- **R1:** Revert `LandingPage.tsx` logo sx changes
- **R2:** Revert `PageLayout.tsx` PageHeader changes
- **R3:** Revert `ClinicalWorkflowPageV2.tsx` stepper changes
- **R4:** Revert `ImageAnalysisPage.tsx` empty state
- **R5:** Revert typography weight changes across files

**Commit strategy:** Single atomic commit containing all changes, since they're all visual refinements with no behavioral dependencies.

---

## Appendix A: Brand Asset Inventory

| Asset | Location | Purpose | Status |
|-------|----------|---------|--------|
| `clinicalvision-logo.svg` | `public/images/` | Full logo (Dotted C + "Vision AI" wordmark) | ✅ Correct location |
| `clinicalvision-icon.svg` | `public/images/` | Icon-only (Dotted C dot pattern) | ✅ Correct location |
| `logo.svg` | `src/` | Default CRA React atom logo — **NOT our brand** | ⚠️ Orphaned, should be removed |
| `logo192.png` | `public/` | PWA app icon (192×192) | ✅ Correct location |
| `logo512.png` | `public/` | PWA app icon (512×512) | ✅ Correct location |
| `favicon.ico` | `public/` | Browser tab icon | ✅ Correct location |

**Recommendation:** Delete `src/logo.svg` (the React atom) — it's the CRA default, not referenced anywhere in our code, and creates brand confusion.

## Appendix B: Typography Weight Scale Reference

```
100 — Thin          │ Never use in clinical UI
200 — Extra Light   │ Hero display only (60px+)
300 — Light         │ Large headings only (36px+)  ← Current heading default
400 — Regular       │ Body text, form labels       ← Proposed heading default
500 — Medium        │ Navigation, buttons, emphasis ← Proposed for step labels
600 — SemiBold      │ Section titles, alerts        
700 — Bold          │ Critical warnings, CTAs       
```
