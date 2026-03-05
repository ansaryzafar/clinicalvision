# Auth Pages & Navbar Consistency — Research, Findings & Implementation Plan

**Date:** March 5, 2026  
**Scope:** Login Page, Registration Page, and Navbar consistency across all pages  
**Approach:** TDD where applicable  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Industry Best Practices Research](#3-industry-best-practices-research)
4. [Design Specification](#4-design-specification)
5. [Implementation Plan (TDD)](#5-implementation-plan-tdd)
6. [Test Plan](#6-test-plan)
7. [Acceptance Criteria](#7-acceptance-criteria)

---

## 1. Executive Summary

### Problems Identified

| # | Problem | Severity |
|---|---------|----------|
| 1 | **Login & Register pages use a generic MUI `LocalHospital` icon** instead of the custom ClinicalVision SVG logo (`/images/clinicalvision-logo.svg`) | 🔴 Critical |
| 2 | **Login & Register pages use zero Lunit design system tokens** — no custom colors, no custom fonts, no brand identity; they default to MUI's Roboto + blue theme | 🔴 Critical |
| 3 | **PageLayout navbar (used on Features, Pricing, About, etc.) is visually smaller and simpler** than the LandingPage navbar — 36px logo vs 72px, 3 nav items vs 4 with dropdowns, no Sign In/Get Started buttons, no scroll animation | 🔴 Critical |
| 4 | **"Get Started" button on LandingPage navigates to LOGIN instead of REGISTER** — should funnel new users to registration | 🟡 Medium |
| 5 | **Login & Register pages are completely standalone** — no navbar, no way to navigate back to the site without browser back button | 🟡 Medium |

### Impact

- **Brand Perception:** Users arriving at Login/Register see a completely different visual identity — generic blue MUI vs the polished teal Lunit brand. This breaks trust, especially critical for a medical AI product where trust is paramount.
- **Navigation Continuity:** Sub-pages (Features, Pricing, About, etc.) feel like a different, lesser product due to the smaller, simpler navbar.
- **Conversion Funnel:** "Get Started" pointing to Login instead of Register loses potential new registrations.

---

## 2. Current State Audit

### 2.1 Login Page (`src/pages/LoginPage.tsx`) — 296 lines

| Aspect | Current State | Issue |
|--------|--------------|-------|
| **Logo** | `<LocalHospital color="primary" sx={{ fontSize: 40 }} />` — MUI hospital cross icon | ❌ Not our brand logo |
| **Typography** | MUI defaults (Roboto), `variant="h4"`, `variant="h5"` | ❌ Should use ClashGrotesk headings, Lexend body |
| **Colors** | `bgcolor: 'background.default'`, `color: 'primary'` — MUI theme defaults | ❌ No teal (#00C9EA), no brand colors |
| **Layout** | Centered single card (`<Paper elevation={3}>`) on plain background | ❌ No brand storytelling, no feature promotion |
| **Form styling** | Default MUI `<TextField>` with default outlines | ❌ Should use lunitDesignSystem inputField styles |
| **Button** | Default MUI contained button (blue) | ❌ Should match brand button styles (black bg, teal hover) |
| **Navigation** | None — standalone page, no way back to marketing site | ❌ Should have minimal branded header |
| **Brand messaging** | "ClinicalVision AI" text only, generic subtitle | ❌ Missed opportunity for feature promotion |
| **Demo credentials** | Displayed in an `<Alert severity="info">` box | ⚠️ OK for dev, should be more polished |

### 2.2 Register Page (`src/pages/RegisterPage.tsx`) — 810 lines

| Aspect | Current State | Issue |
|--------|--------------|-------|
| **Logo** | Same `<LocalHospital>` icon as Login | ❌ Same issue |
| **Typography** | Same MUI defaults | ❌ Same issue |
| **Colors** | Same MUI defaults | ❌ Same issue |
| **Layout** | Centered card, 3-step stepper (Account → Personal Info → Professional) | ❌ No brand storytelling |
| **Stepper** | Default MUI `<Stepper>` | ❌ Should use brand colors |
| **Form** | Well-structured multi-step with validation, password strength indicator | ✅ Good UX, needs brand styling |
| **Navigation** | None — standalone | ❌ Same issue |
| **Brand messaging** | "Join the next generation of AI-powered medical imaging" | ⚠️ Good text, but visually lost |
| **Success screen** | Green CheckCircle + "Welcome to ClinicalVision AI!" | ⚠️ OK but could be branded |

### 2.3 Navbar Inconsistency

#### LandingPage Navbar (inline in `LandingPage.tsx`)
- **Logo:** `/images/clinicalvision-logo.svg?v=11` at **72px** height (md), 52px (xs)
- **Logo text:** None (SVG contains "Vision AI" text)
- **Logo effect:** Teal drop-shadow glow
- **Nav items:** 4 items with dropdown menus (Products, Technology, About, Resources)
- **CTAs:** "Sign In" text button + "Get Started" contained button (black bg, teal hover)
- **Scroll behavior:** Transitions at 20px scroll — adds border, shadow, tighter padding
- **z-index:** 1100
- **Inner padding:** py transitions between 20px (top) and 14px (scrolled)
- **Spacer:** `<div style={{ height: '100px' }}>`

#### PageLayout Navbar (`PageHeader` in `PageLayout.tsx`)
- **Logo:** `/images/clinicalvision-logo.svg` at **36px** height (50% smaller!)
- **Logo text:** "ClinicalVision" in ClashGrotesk Medium 18px
- **Logo effect:** None
- **Nav items:** 3 simple text buttons (Home, Features, Pricing) — no dropdowns
- **CTAs:** "Request Demo" contained button only — no Sign In, no Get Started
- **Scroll behavior:** None — static
- **z-index:** 1000
- **Inner padding:** py: 2 (16px) — static
- **Spacer:** `pt: '72px'`

#### Differences Summary

| Property | LandingPage | PageLayout | Should Be |
|----------|------------|------------|-----------|
| Logo height | 72px (md) | 36px | **72px** (consistent) |
| Logo text | None (in SVG) | "ClinicalVision" text | **None** (SVG has it) |
| Logo glow | ✅ teal shadow | ❌ none | **✅ teal shadow** |
| Nav items | 4 with dropdowns | 3 simple buttons | **4 with dropdowns** |
| Sign In | ✅ | ❌ | **✅** |
| Get Started | ✅ | ❌ | **✅** |
| Scroll animation | ✅ | ❌ | **✅** |
| Mobile drawer | ✅ | ❌ | **✅** |
| Total height | ~100px | ~72px | **~100px** |

---

## 3. Industry Best Practices Research

### 3.1 Medical AI / Healthcare SaaS Login Page Patterns

**Studied:** Lunit, Aidoc, Zebra Medical, Paige AI, PathAI  
**Sources:** NN/g (Nielsen Norman Group), Smashing Magazine, UX Planet

#### Split-Screen Layout (Industry Standard for Premium SaaS)

The dominant pattern for healthcare SaaS and enterprise tools is the **split-screen login**:

| Left Panel (50-60% width) | Right Panel (40-50% width) |
|---------------------------|---------------------------|
| **Brand Storytelling Panel** | **Form Panel** |
| Large hero illustration or gradient background | Clean, focused form |
| Product name + tagline | Form title + subtitle |
| 2-3 key value propositions with icons | Email + Password fields |
| Trust indicators (certifications, stats) | Submit button |
| Testimonial quote (optional) | Footer links |
| Background: dark/brand gradient | Background: white/light |

**Why this pattern works for medical AI:**
1. **Trust Building:** Healthcare professionals need to trust the tool before entering credentials. Showing certifications (FDA, HIPAA, CE Mark) and stats (97.5% sensitivity) builds confidence.
2. **Brand Reinforcement:** Every login is an opportunity to remind users why they chose your product.
3. **Feature Discovery:** Rotating feature highlights can introduce users to capabilities they haven't tried.
4. **Professional Aesthetic:** Split-screen feels premium and enterprise-grade — matching the expectations of healthcare institutions.

#### Key UX Principles (from Smashing Magazine & NN/g research)

1. **Don't disable copy-paste** on password fields — support password managers
2. **Show/hide password toggle** — reduces errors (✅ we already have this)
3. **Clear error messages** — inline validation, not just form-level (✅ we have this)
4. **Demo credentials** should be discoverable but not dominant
5. **Auto-redirect** after login is good (✅ we do this)
6. **Minimal branded header** on auth pages — allows users to navigate back to marketing site
7. **Password strength indicators** on registration (✅ we have this)
8. **Progressive disclosure** via multi-step forms (✅ our 3-step register does this)

### 3.2 Registration Page Best Practices

1. **Split-screen layout** with value proposition on left, form on right
2. **Social proof** — "Join 500+ healthcare institutions" type messaging
3. **Feature highlights that rotate** — showcasing what they'll get access to
4. **Clear step indicators** with branded styling
5. **Minimal fields per step** — our current 3-step approach is ideal
6. **Terms & Privacy** links should be prominent (HIPAA context)
7. **Success state** should be celebratory with brand identity

### 3.3 Navbar Consistency Best Practices

1. **Global navigation must be identical** across all pages of the marketing site
2. **Sticky navbar** with scroll compression is the standard pattern
3. **Logo size consistency** — same logo everywhere, same size
4. **CTA buttons** should always be visible (Sign In / Get Started)
5. **Mobile hamburger** should work identically everywhere

---

## 4. Design Specification

### 4.1 Login Page Redesign

#### Layout: Split-Screen (60/40)

```
┌─────────────────────────────────────────────────────┐
│ [Logo] ClinicalVision                    Back to Home│  ← Minimal header
├────────────────────────┬────────────────────────────┤
│                        │                            │
│   ◉ Brand Panel        │     ◉ Form Panel           │
│                        │                            │
│   [Large Logo SVG]     │     Welcome Back            │
│                        │     Sign in to your account │
│   "AI-Powered          │                            │
│    Breast Cancer        │     [Email Field]          │
│    Detection"           │     [Password Field]       │
│                        │                            │
│   ─────────────         │     [Sign In Button]       │
│                        │                            │
│   ✓ 97.5% Sensitivity  │     ─── or ───             │
│   ✓ FDA Cleared         │                            │
│   ✓ HIPAA Compliant    │     [Demo credentials]     │
│   ✓ 50,000+ Analyses    │                            │
│                        │     Don't have an account?  │
│   "Trusted by 500+     │     [Register here]         │
│    healthcare           │                            │
│    institutions"       │     Forgot password?        │
│                        │                            │
│   © 2026 ClinicalVision│     © 2026 ClinicalVision  │
├────────────────────────┴────────────────────────────┤
```

#### Brand Panel (Left — 55%)
- **Background:** Linear gradient `135deg, #233232 0%, #0F95AB 100%` (dark → teal)
- **Logo:** SVG at 100px height, centered, with teal glow
- **Headline:** "AI-Powered Breast Cancer Detection" in ClashGrotesk Light 36px, white
- **Value Props:** 4 items with CheckCircle icons in teal
  - "97.5% Detection Sensitivity"
  - "FDA 510(k) Cleared"  
  - "HIPAA & GDPR Compliant"
  - "50,000+ Studies Analyzed"
- **Trust line:** "Trusted by healthcare institutions worldwide" in Lexend 14px, grey
- **Bottom:** Subtle pattern or medical imagery overlay at low opacity

#### Form Panel (Right — 45%)
- **Background:** White (`#FFFFFF`)
- **Header:** Minimal logo (36px) + "ClinicalVision" text as link to home
- **Title:** "Welcome Back" in ClashGrotesk Medium 28px, heading color
- **Subtitle:** "Sign in to continue to your dashboard" in Lexend 14px, dark grey
- **Form fields:** Using lunitDesignSystem `inputField` styles — Lexend font, teal focus border
- **Submit button:** lunitDesignSystem primary button — black bg, teal hover, full width, pill shape
- **Demo credentials:** Subtle info card with brand styling
- **Footer links:** "Register here" + "Forgot password?" in Lexend, teal color

#### Responsive (Mobile < 900px)
- Single column — brand panel becomes a compact header strip above the form
- Brand strip: gradient bg, logo, tagline, 2 key stats inline
- Form takes full width below

### 4.2 Register Page Redesign

#### Layout: Split-Screen (55/45) — Same Pattern as Login

#### Brand Panel (Left — 55%)
- **Same gradient background** as Login for consistency
- **Logo:** SVG at 100px height
- **Headline:** "Join the Future of Medical Imaging" in ClashGrotesk Light 36px, white
- **Feature Highlights:** 3 rotating/static feature cards
  1. "🔬 AI Analysis" — "Automated mammogram analysis powered by deep learning"
  2. "📊 Clinical Workflow" — "Streamlined BI-RADS assessment and reporting"
  3. "🛡️ Enterprise Security" — "HIPAA compliant with end-to-end encryption"
- **Social proof:** "Join 500+ healthcare professionals" in Lexend 14px, grey

#### Form Panel (Right — 45%)
- **Same structure as Login** for the chrome (header, background)
- **Title:** "Create Your Account" in ClashGrotesk Medium 28px
- **Subtitle:** "Start analyzing in minutes" in Lexend 14px
- **Stepper:** Branded with teal active step, lunitColors for completed steps
- **Form fields:** Same branded input styles as Login
- **Buttons:** Same branded button styles
- **Step navigation:** Back/Next with brand colors

#### Responsive (Mobile < 900px)
- Same pattern as Login — compact brand strip + full-width form

### 4.3 Navbar Unification

#### Goal: Make PageLayout's `PageHeader` match LandingPage's navbar exactly

**Changes to `PageLayout.tsx` → `PageHeader` component:**

1. **Logo height:** 36px → **72px** (md), **52px** (xs)
2. **Logo text:** Remove "ClinicalVision" Typography (SVG already contains branding)
3. **Logo glow:** Add `filter: 'drop-shadow(0 2px 8px rgba(0, 201, 234, 0.15))'`
4. **Logo hover:** Add `transform: scale(1.05)` transition
5. **Nav items:** Replace 3 simple buttons with 4 dropdown-enabled items matching LandingPage:
   - Products (dropdown: Features, Pricing, Demo, API)
   - Technology (direct → Features)
   - About (dropdown: About Us, Careers, Research, Contact)
   - Resources (dropdown: Documentation, Blog, Support, System Status)
6. **CTAs:** Replace "Request Demo" with "Sign In" + "Get Started" buttons
7. **Scroll behavior:** Add `scrolled` state with py transition (20px → 14px)
8. **Mobile:** Add hamburger menu + Drawer matching LandingPage
9. **Spacer:** `pt: '72px'` → `pt: '100px'` to match LandingPage spacer
10. **Cache-bust:** Add `?v=11` to logo src for consistency

#### "Get Started" Fix
- LandingPage "Get Started" button: Change `ROUTES.LOGIN` → `ROUTES.REGISTER`
- PageLayout "Get Started" button: Wire to `ROUTES.REGISTER`

---

## 5. Implementation Plan (TDD)

### Phase 1: Tests First

#### Test 1: Login Page Brand Elements
```
File: src/__tests__/pages/LoginPage.brand.test.tsx

- ✓ renders the custom SVG logo (not LocalHospital icon)
- ✓ uses ClashGrotesk font family for headings
- ✓ uses Lexend font family for body text
- ✓ displays brand value propositions (sensitivity, FDA, HIPAA)
- ✓ shows branded submit button (not default MUI blue)
- ✓ has a link back to the home page
- ✓ maintains all existing form validation behavior
- ✓ maintains show/hide password toggle
- ✓ displays demo credentials
- ✓ renders responsive mobile layout (no brand panel on small screens)
```

#### Test 2: Register Page Brand Elements
```
File: src/__tests__/pages/RegisterPage.brand.test.tsx

- ✓ renders the custom SVG logo (not LocalHospital icon)
- ✓ uses branded stepper colors (teal active, green completed)
- ✓ displays feature highlights in brand panel
- ✓ displays social proof messaging
- ✓ has a link back to the home page
- ✓ maintains all existing multi-step form behavior
- ✓ maintains password strength indicator
- ✓ maintains all field validations across all 3 steps
```

#### Test 3: Navbar Consistency
```
File: src/__tests__/layout/PageHeader.consistency.test.tsx

- ✓ renders logo at same size as LandingPage (72px)
- ✓ does not render separate "ClinicalVision" text (SVG has it)
- ✓ renders 4 nav items (Products, Technology, About, Resources)
- ✓ renders "Sign In" button linking to /login
- ✓ renders "Get Started" button linking to /register
- ✓ opens dropdown menus on click
- ✓ renders mobile hamburger menu on small screens
- ✓ applies scroll behavior (adds shadow when scrolled)
```

### Phase 2: Implementation Order

| Step | File | Changes | LOE |
|------|------|---------|-----|
| 2.1 | `PageLayout.tsx` | Unify PageHeader navbar with LandingPage navbar (logo size, nav items, CTAs, scroll, mobile) | Large |
| 2.2 | `LoginPage.tsx` | Complete redesign with split-screen layout, brand panel, styled form | Large |
| 2.3 | `RegisterPage.tsx` | Complete redesign with split-screen layout, brand panel, styled stepper/form | Large |
| 2.4 | `LandingPage.tsx` | Fix "Get Started" → REGISTER (one-line change) | Small |
| 2.5 | Verification | TypeScript check, test run, visual review | Medium |

### Phase 3: Verification

1. `npx tsc --noEmit` — zero errors in modified files
2. `npx react-scripts test --watchAll=false` — all tests pass
3. Manual visual review of all routes
4. Git commit with descriptive message

---

## 6. Test Plan

### Unit Tests (Jest + React Testing Library)

| Test File | Tests | Priority |
|-----------|-------|----------|
| `LoginPage.brand.test.tsx` | 10 tests | P0 |
| `RegisterPage.brand.test.tsx` | 8 tests | P0 |
| `PageHeader.consistency.test.tsx` | 8 tests | P0 |

### Visual Verification Checklist

| Page | Check |
|------|-------|
| `/` (LandingPage) | Navbar unchanged, "Get Started" → /register |
| `/login` | Split-screen, brand panel, SVG logo, branded form |
| `/register` | Split-screen, brand panel, SVG logo, branded stepper |
| `/features` | Navbar matches LandingPage (72px logo, 4 items, Sign In/Get Started) |
| `/pricing` | Same navbar consistency |
| `/about` | Same navbar consistency |
| `/documentation` | Same navbar consistency |
| `/blog` | Same navbar consistency |
| `/compliance` | Same navbar consistency (dark variant) |
| `/research` | Same navbar consistency (dark variant) |
| `/status` | Same navbar consistency |

---

## 7. Acceptance Criteria

### Login Page
- [ ] Custom SVG logo displayed (not MUI icon)
- [ ] Split-screen layout with brand panel on left
- [ ] Brand panel shows: gradient bg, logo, tagline, 4 value props, trust line
- [ ] Form panel uses Lunit design system typography and colors
- [ ] Submit button matches brand style (black bg, teal hover, pill shape)
- [ ] Demo credentials displayed with brand-consistent styling
- [ ] "Register here" and "Forgot password" links styled with brand colors
- [ ] Minimal header with logo linking back to home
- [ ] Responsive: mobile shows compact brand strip + full-width form
- [ ] All existing validation and auth behavior preserved

### Register Page
- [ ] Custom SVG logo displayed (not MUI icon)
- [ ] Split-screen layout with brand panel on left
- [ ] Brand panel shows: gradient bg, logo, tagline, feature highlights, social proof
- [ ] Stepper uses brand colors (teal active, green completed)
- [ ] Form fields use Lunit design system input styles
- [ ] All 3 steps preserved with same field structure
- [ ] Password strength indicator preserved
- [ ] Terms & Privacy links preserved
- [ ] Success screen uses brand styling
- [ ] Responsive: mobile shows compact brand strip + full-width form
- [ ] All existing validation and auth behavior preserved

### Navbar Consistency
- [ ] PageLayout navbar matches LandingPage navbar in every aspect
- [ ] Logo: 72px height, teal glow, hover scale
- [ ] Nav items: 4 items with dropdown menus
- [ ] CTAs: "Sign In" + "Get Started" buttons
- [ ] Scroll behavior: padding transition + shadow on scroll
- [ ] Mobile: hamburger menu + full drawer
- [ ] Content spacer updated to 100px
- [ ] "Get Started" navigates to /register (not /login) everywhere
- [ ] All sub-pages (Features, Pricing, About, etc.) show unified navbar
