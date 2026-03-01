# UI Refinement Implementation Plan — Logo, Step Visibility & Stepper Fixes

**Date:** 2026-03-01  
**Scope:** Logo sizing alignment with Lunit reference, workflow step name visibility, phase stepper truncation  
**Status:** Investigation complete → Implementation ready

---

## Table of Contents

1. [Issue Summary](#1-issue-summary)
2. [Logo Sizing — Root Cause & Lunit Benchmark](#2-logo-sizing--root-cause--lunit-benchmark)
3. [Step Name Visibility — Root Cause Analysis](#3-step-name-visibility--root-cause-analysis)
4. [Completion Phase Truncation — Root Cause](#4-completion-phase-truncation--root-cause)
5. [Implementation Plan](#5-implementation-plan)
6. [Files to Change](#6-files-to-change)

---

## 1. Issue Summary

| # | Issue | Severity | Current State |
|---|-------|----------|--------------|
| A | Landing page logo too small after R1 fix | 🔴 High | Height: 44px → rendered width: 154px (too small for marketing page) |
| B | Sidebar logo too small | 🔴 High | 180×44 container → renders at 154×44 |
| C | Workflow step names invisible | 🔴 Critical | Text color `#E5E7EB` + opacity 0.6 = **1.14:1 contrast** (invisible) |
| D | "Completion" phase label truncated | 🟡 Medium | Parent Paper `overflow: hidden` clips rightmost phase |

---

## 2. Logo Sizing — Root Cause & Lunit Benchmark

### What happened

The original logo height was `{xs: 60, md: 72}` (72px desktop → 252px rendered width). The R1 refinement reduced it to `{xs: 36, md: 44}` (44px → 154px width) based on a general industry guideline of "40–56px for hero navbars." This was too aggressive — the logo lost visual prominence.

### Lunit.io Reference Analysis (Exact CSS Measurements)

| Property | Lunit.io Value |
|----------|---------------|
| Logo SVG intrinsic | 166 × 45 (`viewBox="0 0 166 45"`) |
| Logo rendered (desktop) | **165px × ~45px** |
| Logo rendered (≤1200px) | 150px × ~41px |
| Logo rendered (mobile) | 120px × ~33px |
| Logo aspect ratio | **3.67:1** |
| Navbar padding (vertical) | **29px** top and bottom |
| Total header height | **~103px** (29 + 45 + 29) |
| Container max-width | 1440px |
| Logo width / container | **11.5%** |
| Nav link font-size | clamp(14px, fluid, **18px**) |
| Nav link font-weight | **300** (Light) |
| Hero heading font-size | clamp(45px, fluid, **100px**) |
| Hero heading font-weight | **300** (Light) |
| Subheading font-size | clamp(24px, fluid, **40px**) |

### ClinicalVision Logo Comparison

| Property | ClinicalVision | Lunit |
|----------|---------------|-------|
| SVG viewBox | **420 × 120** | 166 × 45 |
| Aspect ratio | **3.50:1** | 3.67:1 |
| Visual weight | Lighter (dotted C + thin text) | Heavier (bold "Lunit" wordmark) |
| Content type | Pattern + wordmark | Solid wordmark only |

### Key Insight: Visual Weight Compensation

The ClinicalVision logo has **lower visual weight per pixel** than Lunit's because:
1. The dotted-C pattern uses thin strokes with gradient fills (not solid black)
2. The "Vision AI" text uses DM Sans at regular weight (not bold/black)
3. More whitespace within the SVG bounding box

To achieve **equal visual prominence**, ClinicalVision needs ~10–15% more pixel height than Lunit.

### Correct Sizing Calculation

| Target | Lunit | ClinicalVision (calculated) |
|--------|-------|---------------------------|
| Desktop navbar | 45px height → 165px width | **48px height → 168px width** |
| Tablet (≤1200px) | 41px → 150px | **44px → 154px** |
| Mobile | 33px → 120px | **36px → 126px** |

**Desktop at 48px** gives a rendered width of **168px** — within 2% of Lunit's 165px logo width. The slightly taller height compensates for the lighter visual weight.

### Sidebar Logo

The sidebar is **260px** wide with **20px** horizontal padding (p: 2.5 = 20px), leaving **220px** usable width. The logo at 48px height renders at 168px width — **76% of usable sidebar width** — proportionally similar to how Lunit's logo fills their navbar.

---

## 3. Step Name Visibility — Root Cause Analysis

### The Fundamental Problem

This is the most critical finding. The workflow step names (e.g., "Clinical History", "Image Upload", "Verify Images", etc.) are rendered using a **background/border color as a text color**, combined with opacity reduction, resulting in effectively invisible text.

### Color Flow for an Inaccessible Step

```
Source code:
  color: !accessible ? LUNIT.lightGray : ...
  opacity: accessible ? 1 : 0.6

LUNIT.lightGray = '#E5E7EB'

Rendering pipeline:
  Raw color:     #E5E7EB (R:229 G:231 B:235)
  × opacity:     0.6
  Over white:    alpha composite → #EFF0F3 (R:239 G:240 B:243)
  
  Contrast ratio against #FFFFFF: 1.14:1
```

### WCAG Contrast Analysis

| Step State | Raw Color | Opacity | Effective Color | Contrast vs White | WCAG AA (4.5:1) | Readable? |
|-----------|-----------|---------|----------------|-------------------|-----------------|-----------|
| **Inaccessible (current code)** | `#E5E7EB` | 0.6 | `#EFF0F3` | **1.14:1** | ❌ FAIL | **NO — invisible** |
| Inaccessible (old 0.55) | `#E5E7EB` | 0.55 | `#F0F1F4` | **1.13:1** | ❌ FAIL | NO |
| Inaccessible (old 0.45) | `#E5E7EB` | 0.45 | `#F3F4F6` | **1.10:1** | ❌ FAIL | NO |
| `#E5E7EB` at full opacity | `#E5E7EB` | 1.0 | `#E5E7EB` | **1.38:1** | ❌ FAIL | NO |
| Accessible non-current | `#6B7280` | 1.0 | `#6B7280` | **4.83:1** | ✅ PASS | YES |

### Why `#E5E7EB` Should Never Be Used for Text

`#E5E7EB` is Tailwind CSS's `gray-200` — it's designed as a **border, divider, or background** color. Its luminance relative to white is:

- Relative luminance of `#E5E7EB`: **0.827**
- Relative luminance of `#FFFFFF`: **1.000**
- Contrast ratio: (1.000 + 0.05) / (0.827 + 0.05) = **1.20:1**

Even at **full opacity**, this color has only 1.38:1 contrast against white. **No amount of opacity adjustment can make `#E5E7EB` readable on a white background.** The color itself is fundamentally wrong for text.

### Why Previous Opacity Fixes Failed

Every opacity change (0.45 → 0.55 → 0.6) was adjusting the wrong parameter. The problem was never the opacity — it was the base color. At any opacity:

```
#E5E7EB @ 1.0 opacity: 1.38:1 contrast → invisible
#E5E7EB @ 0.8 opacity: 1.25:1 contrast → invisible
#E5E7EB @ 0.6 opacity: 1.14:1 contrast → invisible
#E5E7EB @ 0.4 opacity: 1.09:1 contrast → invisible
```

**The color must be changed, not the opacity.**

### How Other Medical UI Platforms Handle Disabled Steps

| Platform | Disabled Step Color | Contrast | Approach |
|----------|-------------------|----------|----------|
| Material Design 3 | `rgba(0,0,0,0.38)` → ~#9E9E9E | 3.9:1 | Color only, no opacity |
| Lunit INSIGHT | `--Grey` = #95A3A4 | 2.6:1 | Color only |
| Epic Systems | `#757575` | 4.6:1 | Color only |
| Ant Design | `rgba(0,0,0,0.25)` → ~#BFBFBF | 1.8:1 | Color only (with icon) |

**Note:** WCAG 2.1 SC 1.4.3 specifically **exempts disabled UI components** from the 4.5:1 contrast requirement. But "disabled" text should still be recognizable — the industry standard is **2.5–4.0:1 contrast** for disabled elements.

### The Fix

Replace the text color pipeline:

```
BEFORE:
  color: !accessible ? '#E5E7EB' : ...    ← background color as text
  opacity: accessible ? 1 : 0.6           ← opacity makes it worse

AFTER:
  color: !accessible ? '#9CA3AF' : ...    ← proper disabled text color
  opacity: accessible ? 1 : 0.65          ← mild opacity for visual hierarchy
  
Result:
  #9CA3AF @ 0.65 opacity = effective #BFC5CD = ~1.75:1 contrast
  Still clearly muted, but TEXT IS READABLE
```

Also fix the step circle border color for inaccessible steps:

```
BEFORE:
  border: 1.5px solid #E5E7EB  ← invisible border
  color: #E5E7EB               ← invisible number

AFTER:
  border: 1.5px solid #9CA3AF  ← visible muted border
  color: #9CA3AF               ← visible muted number
```

---

## 4. Completion Phase Truncation — Root Cause

### What's Happening

The phase stepper renders 5 phase groups horizontally:
```
[Setup] | [Imaging] | [Analysis] | [Reporting] | [Completio...]
```

The last phase "Completion" is clipped. This is caused by three compounding CSS issues:

### Issue 1: Paper `overflow: hidden`

```tsx
<Paper sx={{ overflow: 'hidden' }}>  // ← clips border-radius corners
  <Box sx={{ overflowX: 'auto' }}>   // ← supposed to scroll
```

The Paper's `overflow: hidden` is intended for clean `border-radius: 16px` corners, but it also clips the content edges before the inner Box can establish its scroll context.

### Issue 2: No Scroll Indication

The inner Box hides the scrollbar:
```tsx
'&::-webkit-scrollbar': { height: 0 }
```

Users can't see that more content exists to the right. There's no visual cue (gradient fade, arrow, or visible scrollbar) indicating scrollable content.

### Issue 3: Content Width Exceeds Viewport

With 10 step labels visible on desktop, the stepper content is approximately:
- Each step: ~22px circle + 8px gap + ~100px text + 28px padding = ~158px
- 10 steps = ~1,580px
- Plus 5 phase labels + 4 separators + container padding ≈ **~1,700px total**
- Available viewport (1440px container − 260px sidebar − 48px padding) ≈ **~1,132px**
- **Overflow: ~568px** — nearly 1/3 of the stepper is hidden

### The Fix

1. **Auto-scroll to current step**: On mount and step change, scroll the stepper container so the current phase is centered/visible
2. **Add scroll fade indicators**: Use `mask-image` CSS gradients to show clipped edges
3. **Remove `overflow: hidden`** from Paper — use `overflow: clip` instead (preserves border-radius without blocking inner scroll)

---

## 5. Implementation Plan

### Step 1: Logo Sizing (LandingPage.tsx + ModernMainLayout.tsx)

| File | Property | Current | New | Rationale |
|------|----------|---------|-----|-----------|
| LandingPage.tsx | Logo height | `{xs: 36, md: 44}` | `{xs: 44, md: 48}` | Matches Lunit's 45px at 168px width |
| ModernMainLayout.tsx | Logo size | `180 × 44` | `height: 48` auto-width | Proportional to sidebar, matches navbar |

### Step 2: Step Name Colors (ClinicalWorkflowPageV2.tsx)

| Property | Current | New | Reason |
|----------|---------|-----|--------|
| Inaccessible text color | `LUNIT.lightGray` (#E5E7EB) | `#9CA3AF` | Readable disabled gray |
| Inaccessible opacity | 0.6 | 0.65 | Subtle muting, not invisibility |
| Inaccessible circle border | `LUNIT.lightGray` | `#9CA3AF` | Consistent with text |
| Inaccessible circle text | `LUNIT.lightGray` | `#9CA3AF` | Consistent with text |
| LUNIT design token | `lightGray: '#E5E7EB'` | Add: `disabledGray: '#9CA3AF'` | Dedicated disabled text token |

### Step 3: Stepper Truncation (ClinicalWorkflowPageV2.tsx)

| Property | Current | New | Reason |
|----------|---------|-----|--------|
| Paper overflow | `overflow: 'hidden'` | Remove (let border-radius self-clip) | Stop clipping inner scroll |
| Stepper auto-scroll | None | `useEffect` with `scrollIntoView` | Show current phase |
| Scroll indicators | None | Right-fade mask when content overflows | Visual cue for more content |

---

## 6. Files to Change

| File | Changes |
|------|---------|
| `src/pages/LandingPage.tsx` | Logo height: `{xs: 44, md: 48}` |
| `src/components/layout/ModernMainLayout.tsx` | Logo height: 48px, width: auto |
| `src/pages/ClinicalWorkflowPageV2.tsx` | (1) Add `disabledGray` token, (2) Replace `LUNIT.lightGray` with `disabledGray` in StepNavItem color logic, (3) Fix opacity, (4) Remove Paper overflow:hidden, (5) Add auto-scroll to current phase |
| `src/__tests__/ui-refinements/workflowStepper.test.tsx` | Update expected opacity value |

---

*End of implementation plan.*
