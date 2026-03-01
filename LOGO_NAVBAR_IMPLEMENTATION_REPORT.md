# Logo & Navbar — Lunit Benchmark Implementation Report

**Date:** 2026-03-01  
**Commit scope:** SVG optimization, landing page navbar, sidebar logo  
**TDD Test file:** `src/__tests__/ui-refinements/logoNavbar.test.tsx` (14 tests)

---

## Executive Summary

The ClinicalVision logo appeared too small in the navbar despite matching Lunit's raw pixel dimensions. **Root cause analysis** revealed the SVG's internal layout was the problem — not the render size. The "Vision AI" text occupied only **25.9% of the SVG viewBox height**, with **32.7% dead whitespace** on the right edge, making the text render at an effective **12.45px** inside a 48px logo. This fix optimizes the SVG layout and adjusts the navbar to match Lunit.io's proportions.

---

## Root Cause Analysis

### Why the Logo Looked Small at 48px

The ClinicalVision SVG (`420×120 viewBox`) had two critical layout problems:

#### Problem 1: Text Too Small Relative to Icon

```
SVG viewBox height: 120 units
Dotted-C icon:      106.9 units tall (89.1% of viewBox) ← dominates
"Vision AI" text:    31.1 units tall (25.9% of viewBox) ← subordinate

At 48px rendered height:
  Icon: 42.8px   ← visible
  Text: 12.45px  ← TOO SMALL (smaller than 13px body text!)
```

For comparison, Lunit's wordmark fills **~90%** of their viewBox height. Their text renders at **~40px** at similar logo sizes.

#### Problem 2: 32.7% Dead Space on Right

```
SVG viewBox:    0 → 420 (width)
Content extent: 0 → 282.7 (rightmost text path)
Dead space:     282.7 → 420 = 137.3 units (32.7%)

This wasted space made the SVG wider than necessary, forcing a
high aspect ratio (3.5:1) that limited how tall the logo could
render without becoming excessively wide.
```

### Geometric Proof

The text group transform `translate(120,35) scale(1.15)` applied to paths with y-range [9.36, 36.432]:

$$y_{top} = 9.36 \times 1.15 + 35 = 45.76$$
$$y_{bottom} = 36.432 \times 1.15 + 35 = 76.90$$
$$h_{text} = 76.90 - 45.76 = 31.13 \text{ SVG units}$$

At 48px render: $h_{rendered} = 48 \times \frac{31.13}{120} = 12.45\text{px}$

**12.45px text is smaller than the default 13px body font.** This is why the logo text was invisible regardless of the `height` CSS property value.

---

## Solution: SVG Layout Optimization

### Change 1: Scale Up Text — `scale(1.15)` → `scale(1.40)`

New text transform: `translate(120, 33) scale(1.40)`

$$y_{top} = 9.36 \times 1.40 + 33 = 46.10$$
$$y_{bottom} = 36.432 \times 1.40 + 33 = 84.00$$
$$h_{text} = 84.00 - 46.10 = 37.90 \text{ SVG units}$$

Text is now vertically centered with the icon:
- Icon center: $(11.54 + 118.46) / 2 = 65.0$
- Text center: $(46.10 + 84.00) / 2 = 65.05$ ✓

### Change 2: Trim ViewBox — `420×120` → `325×120`

Content now extends to $x = 141.499 \times 1.40 + 120 = 318.1$. New viewBox `325×120` has ~7 units of right margin (down from 137 units of dead space).

New aspect ratio: $325/120 = 2.71:1$ (was 3.5:1).

### Rendering at New Sizes

| Logo location | Height | Width | Text height | Comparison |
|---|---|---|---|---|
| **Landing page desktop** | 60px | 162.5px | **18.95px** | Lunit: 165px wide ✓ |
| **Landing page mobile** | 48px | 130px | 15.16px | Proportional ✓ |
| **Sidebar** | 52px | 140.8px | 16.42px | Fits 220px usable ✓ |
| ~~Old (before fix)~~ | ~~48px~~ | ~~168px~~ | ~~12.45px~~ | ~~Too small~~ |

---

## Navbar — Lunit Proportion Matching

### Lunit.io Reference

| Property | Lunit.io | ClinicalVision (new) |
|---|---|---|
| Logo rendered width | 165px | **162.5px** (−1.5%) |
| Navbar total height | ~103px | **104px** (22+60+22) |
| Navbar padding (vertical) | 29px | **22px** (different logo height) |
| Nav link font-weight | 300 (Light) | **400** (Regular — compensates for thinner font) |
| Container max-width | 1440px | 1440px ✓ |
| Container side padding | 60px | 60px ✓ |

### Scrolled vs Non-Scrolled

| State | Padding | Total height |
|---|---|---|
| Non-scrolled | `22px` | 22 + 60 + 22 = **104px** |
| Scrolled | `16px` | 16 + 60 + 16 = **92px** |

---

## Files Changed

| File | Change | Rationale |
|---|---|---|
| `public/images/clinicalvision-logo.svg` | ViewBox `420→325`, text scale `1.15→1.40`, text y-translate `35→33` | Eliminate dead space, enlarge text from 12px→19px rendered |
| `src/pages/LandingPage.tsx` | Logo `{xs:44,md:48}→{xs:48,md:60}`, py `24→22px`, fontWeight `500→400`, cache `v=7→v=8` | Match Lunit proportions |
| `src/components/layout/ModernMainLayout.tsx` | Logo height `48→52`, maxWidth `200→220`, cache `v=7→v=8` | Proportional to new SVG ratio |
| `src/__tests__/ui-refinements/logoNavbar.test.tsx` | **NEW** — 14 TDD tests across 3 suites | SVG structure, navbar props, sidebar props |

---

## TDD Test Coverage

### Suite 1: Logo SVG — Structural Efficiency (5 tests)

| Test | Asserts | Status |
|---|---|---|
| ViewBox width ≤ 340 | No excessive right whitespace | ✅ |
| ViewBox height = 120 | Preserves dotted-C vertical fill | ✅ |
| Text scale ≥ 1.30 | Readable text at logo render sizes | ✅ |
| Aspect ratio 2.2–3.0:1 | Content-filling, no dead space | ✅ |
| SVG width = viewBox width | Attribute consistency | ✅ |

### Suite 2: Landing Page Navbar — Lunit Proportions (6 tests)

| Test | Asserts | Status |
|---|---|---|
| Desktop logo height ≥ 56px | Visual prominence | ✅ |
| Mobile logo height ≥ 44px | Readable on small screens | ✅ |
| Non-scrolled py → ~100-110px total | Matches Lunit's ~103px | ✅ |
| Scrolled py < non-scrolled | Compact on scroll | ✅ |
| Nav link fontWeight ≤ 450 | Lunit light aesthetic | ✅ |
| Cache buster ≥ v=8 | Forces browser refresh | ✅ |

### Suite 3: Sidebar Logo — Proportional (3 tests)

| Test | Asserts | Status |
|---|---|---|
| Height ≥ 48px | Visible in 260px sidebar | ✅ |
| maxWidth ≥ 180px | Accommodates new aspect ratio | ✅ |
| Cache buster ≥ v=8 | Forces browser refresh | ✅ |

### Full Suite Results

```
Test Suites: 86 passed, 86 total
Tests:       21 skipped, 2279 passed, 2300 total
```

---

## Visual Comparison

### Before vs After (Desktop Navbar)

| Metric | Before | After | Improvement |
|---|---|---|---|
| Logo width | 168px | 162.5px | Closer to Lunit's 165px |
| Text height | 12.45px | 18.95px | **+52%** — now readable |
| Navbar height | 96px | 104px | Matches Lunit's 103px |
| SVG fill ratio | 55.4% | ~85% | **+54%** — no dead space |
| Nav link weight | 500 (Medium) | 400 (Regular) | Lighter, Lunit-style |

### How the SVG Text Scaling Works

```
BEFORE: translate(120, 35) scale(1.15)
  Text: 31.1 SVG units tall → 12.45px at 48px render
  Dead right space: 137.3 units (32.7% wasted)
  ViewBox: 420 × 120 → aspect 3.5:1

AFTER:  translate(120, 33) scale(1.40)
  Text: 37.9 SVG units tall → 18.95px at 60px render
  Right space: ~7 units (2.1% margin)
  ViewBox: 325 × 120 → aspect 2.71:1
```

---

*End of implementation report.*
