# ClinicalVision UI Enhancement Suggestions
## Buttons, Cards & Dropdown Navigation — Enterprise-Grade Audit & Recommendations

> **Date**: March 8, 2026  
> **Scope**: Button uniformity & interactivity, card hover system, dropdown navigation aesthetics  
> **Brand Reference**: Lunit.io design system + Stripe/Linear/Tempus enterprise patterns  
> **Design System**: `lunitDesignSystem.ts` tokens (lunitColors, lunitShadows, lunitRadius, lunitTransitions)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Button Audit & Standardization](#2-button-audit--standardization)
3. [Card Hover System Unification](#3-card-hover-system-unification)
4. [Dropdown Navigation Enhancement](#4-dropdown-navigation-enhancement)
5. [Implementation Specifications](#5-implementation-specifications)
6. [Mobile Considerations](#6-mobile-considerations)
7. [Accessibility Requirements](#7-accessibility-requirements)
8. [Priority Matrix](#8-priority-matrix)

---

## 1. Executive Summary

### Current State Analysis

The ClinicalVision UI has **three critical inconsistency areas** that undermine enterprise credibility:

| Area | Issue | Severity |
|------|-------|----------|
| **Buttons** | 22 buttons across LandingPage with 6+ different hover patterns, inconsistent transitions (0.2s–0.4s), mismatched font sizes (14px–20px), and 3 different border-radius values | 🔴 High |
| **Cards** | 10 card types on LandingPage, each with a unique hover effect. 0 of 10 use the flagship teal glow from TechnologyPage. No shared card system | 🔴 High |
| **Dropdowns** | Functional but visually basic. MUI defaults with minimal animation. No hover-intent, no safe-triangle pattern, no visual hierarchy within dropdowns, no promotional sections | 🟡 Medium |

### Target State

A **unified interaction design system** where:
- Every button follows one of 3 defined variants with identical transitions
- Every card uses the flagship `translateY(-6px)` + teal top-edge glow on hover
- Dropdown menus match Stripe/Lunit-level polish with smooth animations and rich content

---

## 2. Button Audit & Standardization

### 2.1 Current Inconsistencies Found

#### Transition Timing Chaos
| Button | Current Transition | Expected |
|--------|-------------------|----------|
| Hero CTAs | `all 0.3s ease` | `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)` |
| "Discover the Architecture" | `0.3s` (no property specified) | `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)` |
| "View All News" | **None** ❌ | `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)` |
| "View Publications" | **None** ❌ | `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)` |
| "Download Evaluation Package" | `0.3s ease` | `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)` |
| Partner link buttons | `color 0.3s ease` (color only) | `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)` |
| Product Section CTAs | `all 0.3s ease` | `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)` |

> **Recommendation**: Standardize ALL buttons to `lunitTransitions.smooth` → `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)` — the same easing used on TechnologyPage cards. The cubic-bezier provides a professional "ease-out with snap" feel.

#### Border-Radius Mismatch
| Button | Current | Expected |
|--------|---------|----------|
| All main CTAs | `'100px'` (pill) | ✅ Correct |
| "Download Evaluation Package" | `'50px'` ❌ | `'100px'` |
| Nav buttons | `'8px'` | ✅ Correct (nav-specific) |

#### Font Weight / Size Spread
| Context | Current Size | Current Weight | Recommended Size | Recommended Weight |
|---------|-------------|---------------|-----------------|-------------------|
| Navbar CTA | `15px` | 500 | `14px` | 500 |
| Hero CTAs | `clamp(16px, 1.2vw, 20px)` | 500 | `clamp(15px, 1.1vw, 18px)` | 600 |
| Section CTAs (large) | Inconsistent (varies) | 500 | `16px` | 600 |
| News section buttons | `15px` | 500 | `15px` | 600 |
| Final CTA | `17px` | 500 | `16px` | 600 |
| "Download" button | `16px` | **600** ❌ outlier | `16px` | 600 |

> **Recommendation**: Standardize to weight `600` for all actionable buttons (not 500). Enterprise SaaS universally uses semi-bold (600) for CTA buttons — it signals "clickable action" more clearly than medium (500). This is consistent with Stripe (600), Lunit (600), and Linear (500-600 range).

#### Hover Effect Inconsistencies
| Hover Pattern | Buttons Using It | Issue |
|---------------|-----------------|-------|
| Black → Teal bg | Hero primary, Product primary, Solutions CTAs, "Explore the Platform", "View Publications & Validation" | ✅ Correct primary pattern |
| Teal → Darker Teal bg | "View System Architecture", "Download Evaluation Package", Final CTA "Request a Demo" | ❌ Three teal-default buttons — inconsistent with the black-default pattern |
| Border color change only | Outlined buttons (Hero secondary, "Discover the Architecture", "Technical Documentation", "Schedule a Consultation") | ⚠️ Acceptable but should add subtle `translateY(-2px)` lift |
| Text color only | Partner link buttons | ⚠️ Too subtle — should add arrow slide animation |
| **No hover at all** | "View All News", "View Publications" | 🔴 Missing transitions entirely |

### 2.2 Recommended Button Variants

Define exactly **4 button variants** in the design system:

#### Variant A: Primary Contained (Black → Teal)
```
Purpose: Main conversion CTAs ("Request a Demo", "Begin Analysis", "Launch Clinical Demo")
Base:
  bgcolor: lunitColors.black (#000000)
  color: lunitColors.white (#FFFFFF)
  borderRadius: lunitRadius.full (100px)
  fontWeight: 600
  fontFamily: 'Lexend'
  letterSpacing: '-0.01em'
  textTransform: 'none'
  transition: lunitTransitions.smooth (all 0.35s cubic-bezier(0.4, 0, 0.2, 1))
  boxShadow: 'none'
  
Hover:
  bgcolor: lunitColors.primaryTeal (#00C9EA)
  color: lunitColors.white
  transform: 'translateY(-2px)'
  boxShadow: '0 6px 20px rgba(0, 201, 234, 0.3)'
  
Active:
  transform: 'translateY(0px)'
  boxShadow: '0 2px 8px rgba(0, 201, 234, 0.2)'
```

#### Variant B: Secondary Outlined (Border accent on hover)
```
Purpose: Supporting CTAs ("Sign In", "Technical Documentation", "Schedule a Consultation")
Base:
  bgcolor: 'transparent'
  color: lunitColors.black (#000000) — OR white for dark sections
  border: '1.5px solid' + alpha(lunitColors.darkerGray, 0.2)
  borderRadius: lunitRadius.full (100px)
  fontWeight: 600
  fontFamily: 'Lexend'
  transition: lunitTransitions.smooth
  
Hover:
  borderColor: lunitColors.primaryTeal (#00C9EA)
  color: lunitColors.primaryTeal
  bgcolor: alpha(lunitColors.primaryTeal, 0.04)
  transform: 'translateY(-2px)'
  boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)'
  
Active:
  transform: 'translateY(0px)'
  boxShadow: 'none'
```

#### Variant C: Accent Contained (Teal → Darker Teal)
```
Purpose: High-emphasis CTAs on special sections ("View System Architecture", "Download Evaluation Package")
Base:
  bgcolor: lunitColors.primaryTeal (#00C9EA)
  color: lunitColors.white
  borderRadius: lunitRadius.full (100px)
  fontWeight: 600
  fontFamily: 'Lexend'
  transition: lunitTransitions.smooth
  
Hover:
  bgcolor: lunitColors.deeperTeal (#0F95AB)
  transform: 'translateY(-2px)'
  boxShadow: '0 6px 20px rgba(0, 201, 234, 0.35)'
  
Active:
  transform: 'translateY(0px)'
  bgcolor: '#0D8599'
```

#### Variant D: Text/Link Button (Subtle with arrow animation)
```
Purpose: Tertiary actions, in-card links ("Initiate a Pilot Program", "View Research Initiatives")
Base:
  color: lunitColors.primaryTeal (#00C9EA)
  fontWeight: 600
  fontFamily: 'Lexend'
  textTransform: 'none'
  transition: lunitTransitions.smooth
  padding: '8px 0'
  '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' }
  
Hover:
  color: lunitColors.deeperTeal (#0F95AB)
  bgcolor: 'transparent'
  '& .MuiButton-endIcon': { transform: 'translateX(4px)' }
  
  Optional underline reveal:
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 4,
    left: 0,
    width: '100%',
    height: '2px',
    bgcolor: lunitColors.primaryTeal,
    transform: 'scaleX(0)',
    transformOrigin: 'left',
    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
  }
  '&:hover::after': { transform: 'scaleX(1)' }
```

### 2.3 Button-by-Button Fix Map

| # | Button Text | Section | Current Variant | Target Variant | Changes Needed |
|---|------------|---------|----------------|---------------|----------------|
| 1 | "Request a Demo" | Navbar | A (black) | A | Add `translateY(-2px)` hover, add active state |
| 2 | "Sign In" | Navbar | Text | B (outlined) | Upgrade to outlined for more presence |
| 3 | "Request a Demo" | Hero | A (black) | A | Standardize transition to `cubic-bezier`, add active state |
| 4 | "Sign In" | Hero | B (outlined) | B | Add `translateY(-2px)`, add teal bg tint on hover |
| 5 | "Discover the Architecture" | Reimagining | B (outlined) | B | Standardize transition, add `translateY(-2px)` |
| 6 | "Launch Clinical Demo" | Product | A (black) | A | ✅ Mostly correct — add active state |
| 7 | "Technical Documentation" | Product | B (outlined) | B | Add `translateY(-2px)`, add teal bg tint |
| 8 | "View System Architecture" | Tech Hero | C (teal) | C | ✅ Correct base — add active state |
| 9 | "Begin Analysis" | Solutions | A (black) | A | ✅ Correct — add active state |
| 10 | "View Capabilities" | Solutions | A (black) | A | ✅ Correct — add active state |
| 11 | "Initiate a Pilot Program" | Partners | D (text) | D | Add arrow slide, add underline reveal |
| 12 | "View Research Initiatives" | Partners | D (text) | D | Add arrow slide, add underline reveal |
| 13 | "Explore the Platform" | AI Section | A (black) | A | ✅ Correct — add active state |
| 14 | "View Publications & Validation" | Investor | A (black) | A | ✅ Correct — add active state |
| 15 | "View All News" | News | B (outlined) | B | 🔴 **Add transition** (currently missing), add hover lift |
| 16 | "View Publications" | News | B (outlined) | B | 🔴 **Add transition** (currently missing), add hover lift |
| 17 | "Download Evaluation Package" | Demo Data | C (teal) | C | Fix borderRadius `50px→100px`, fix fontWeight `600` (correct), standardize transition |
| 18 | "Request a Demo" | Final CTA | C (teal) | A (black) | ⚠️ **Change to black→teal** for consistency with hero CTA. Or keep teal — design decision |
| 19 | "Schedule a Consultation" | Final CTA | B (outlined) | B | Standardize hover, add teal bg tint |
| 20 | "Login" | Mobile Drawer | B (outlined) | B | ✅ Fine as-is |
| 21 | "Request a Demo" | Mobile Drawer | A (black) | A | ✅ Fine as-is |

### 2.4 Interactive Micro-Interactions to Add

#### A. Button Press Effect (Active State)
Every button should have an `:active` state:
```
'&:active': {
  transform: 'translateY(0px) scale(0.98)',
  transition: 'all 0.1s ease',
}
```
This provides tactile "click" feedback — the button compresses slightly on press. Currently **no button has an active state**.

#### B. Focus-Visible Ring
For keyboard navigation accessibility:
```
'&:focus-visible': {
  outline: '2px solid #00C9EA',
  outlineOffset: '3px',
  boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
}
```

#### C. Icon Animations
- **ArrowForward endIcon**: Should slide `4px` right on hover (currently static)
- **CloudDownload startIcon**: Should have subtle bounce on hover
- **ExpandMore icon** (dropdowns): Already rotates ✅

#### D. Ripple Configuration
MUI's default ripple can be customized:
```
// For teal buttons, ripple should be white
<Button sx={{ '& .MuiTouchRipple-root': { color: alpha('#FFFFFF', 0.3) } }}>

// For outlined/dark buttons, ripple should be teal
<Button sx={{ '& .MuiTouchRipple-root': { color: alpha('#00C9EA', 0.2) } }}>
```

---

## 3. Card Hover System Unification

### 3.1 Current State — No Two Cards Are Alike

| Card | Hover Transform | Hover Shadow | Hover BG | Transition |
|------|----------------|-------------|----------|------------|
| StatCard (×4) | None | None | None | None |
| Tech Feature Cards (×3) | `translateX(8px)` | None | `rgba(0,201,234,0.05)` | `0.3s ease` |
| Partner Cards (×2) | Internal `scale(1.2)` | None | Gradient overlay | `0.5s ease` |
| News Cards (×3) | `scale(1.02)` | `0 10px 40px...` | Internal gradient | `0.4s ease` |
| Demo Case Cards (×3) | `translateY(-4px)` | Custom per-card | None | `0.3s ease` |
| Testimonial Badges (×3) | None | None | None | None |
| TechnologyPage Pillars (×6) | `translateY(-6px)` ✅ | Teal glow ✅ | None | `0.35s cubic-bezier` |
| FeaturesPage Cards | `translateY(-6px)` ✅ | Teal glow ✅ | None | `0.35s cubic-bezier` |

> The TechnologyPage + FeaturesPage already have the **correct flagship effect**. The LandingPage has **zero cards** using it.

### 3.2 The Flagship Card Hover Effect (Reference Standard)

This is the effect from TechnologyPage "Core Technology Pillars" that should be replicated:

```
// Base card styles
{
  bgcolor: lunitColors.white,
  borderRadius: lunitRadius['2xl'],  // 20px
  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
  boxShadow: 'none',
  transition: lunitTransitions.smooth,  // all 0.35s cubic-bezier(0.4, 0, 0.2, 1)
  cursor: 'default',  // or 'pointer' if clickable
  position: 'relative',
  overflow: 'hidden',
}

// Hover state
'&:hover': {
  transform: 'translateY(-6px)',
  boxShadow: lunitShadows.cardHoverTeal,
    // → '0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18)'
    // This creates: teal 3px top-edge line + teal-tinted depth shadow
}
```

**Why this effect works:**
- The `translateY(-6px)` lift creates a clear "active/interactive" signal
- The top-edge teal line (`0 -3px 0 0 #00C9EA`) acts as a brand-color "highlight bar" — a Lunit signature
- The depth shadow (`0 10px 40px rgba(0, 201, 234, 0.18)`) is brand-tinted, not generic gray
- The `cubic-bezier(0.4, 0, 0.2, 1)` easing gives a "decelerate" feel — fast start, smooth finish

### 3.3 Card-by-Card Enhancement Map

#### StatCard (×4) — Stats Section
**Current**: No hover effect. Pure text/number display.  
**Recommendation**: Add **subtle hover** — these are informational, not actionable:
```
'&:hover': {
  transform: 'translateY(-4px)',  // Reduced from -6px (less emphasis for non-clickable)
  '& .stat-number': {
    color: lunitColors.primaryTeal,  // Number changes to teal
    transition: 'color 0.35s ease',
  },
  '& .stat-divider': {
    width: '100%',  // Divider line extends full width
    bgcolor: lunitColors.primaryTeal,
    transition: 'all 0.35s ease',
  },
}
```
> Note: StatCards are informational — a lighter hover (no shadow, just lift + color accent) distinguishes them from actionable cards.

#### Technology Feature Cards (×3) — Dark Section
**Current**: `translateX(8px)` + teal bg tint.  
**Recommendation**: These are on a dark background, so the teal glow shadow won't be as visible. Keep the horizontal slide but add the teal top-edge:
```
'&:hover': {
  transform: 'translateX(8px)',  // Keep unique horizontal slide (section-specific)
  boxShadow: '0 -3px 0 0 #00C9EA',  // Just the top-edge line, skip depth shadow on dark bg
  bgcolor: alpha(lunitColors.primaryTeal, 0.08),
  borderColor: alpha(lunitColors.primaryTeal, 0.3),
}
```

#### Partner Cards (×2) — Image Background Cards
**Current**: Internal background `scale(1.2)` zoom + gradient overlay.  
**Recommendation**: Keep the image zoom (it's a strong visual effect for image cards) but ADD the card-level lift + teal glow:
```
// Add to the outer Box
'&:hover': {
  transform: 'translateY(-6px)',
  boxShadow: lunitShadows.cardHoverTeal,
  // Internal effects remain:
  '& .partner-card-bg': { transform: 'scale(1.15)' },  // Reduce from 1.2 to 1.15
  '& .partner-gradient-hover': { opacity: 1 },
}
```

#### News Cards (×3) — Featured News
**Current**: `scale(1.02)` + internal gradient reveal.  
**Recommendation**: Replace `scale(1.02)` with `translateY(-6px)` + teal glow. Keep the internal gradient as an additional layer:
```
'&:hover': {
  transform: 'translateY(-6px)',  // Replace scale(1.02) with lift
  boxShadow: lunitShadows.cardHoverTeal,  // Add teal glow
  '& .news-gradient-overlay': { opacity: 1 },  // Keep internal gradient
}
transition: lunitTransitions.smooth  // Standardize from 0.4s to 0.35s
```

#### Demo Case Cards (×3) — Demo Data Section
**Current**: `translateY(-4px)` + per-card color border (teal/orange/red).  
**Recommendation**: Increase lift to `-6px`, add teal glow as base, but KEEP the per-card accent colors for the top-edge line only:
```
// Normal Case Card (teal accent)
'&:hover': {
  transform: 'translateY(-6px)',  // Increase from -4px
  boxShadow: '0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18)',  // Teal glow
  borderColor: alpha('#00C9EA', 0.3),
}

// Suspicious Case Card (orange accent — keep differentiation)
'&:hover': {
  transform: 'translateY(-6px)',
  boxShadow: '0 -3px 0 0 #FF9800, 0 10px 40px rgba(255, 152, 0, 0.15)',  // Orange variant
  borderColor: alpha('#FF9800', 0.3),
}

// Calcification Case Card (red accent — keep differentiation)
'&:hover': {
  transform: 'translateY(-6px)',
  boxShadow: '0 -3px 0 0 #F44336, 0 10px 40px rgba(244, 67, 54, 0.15)',  // Red variant
  borderColor: alpha('#F44336', 0.3),
}
```
> The demo case cards are a special case — each represents a different clinical urgency level. The color-coded top-edge lines (teal/orange/red) maintain clinical meaning while following the unified shadow structure.

#### Testimonial Metric Badges (×3)
**Current**: No hover.  
**Recommendation**: Add subtle scale + glow (these are small, so translateY would feel too strong):
```
'&:hover': {
  transform: 'scale(1.05)',
  boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)',
  borderColor: alpha(lunitColors.primaryTeal, 0.3),
  transition: lunitTransitions.smooth,
}
```

### 3.4 New Design System Tokens to Add

Add these to `lunitDesignSystem.ts` for reuse:

```typescript
// Additional shadow variants for colored top-edge effects
export const lunitShadows = {
  ...existing,
  cardHoverOrange: '0 -3px 0 0 #FF9800, 0 10px 40px rgba(255, 152, 0, 0.15)',
  cardHoverRed: '0 -3px 0 0 #F44336, 0 10px 40px rgba(244, 67, 54, 0.15)',
  cardHoverGreen: '0 -3px 0 0 #22C55E, 0 10px 40px rgba(34, 197, 94, 0.15)',
  buttonHoverTeal: '0 6px 20px rgba(0, 201, 234, 0.3)',
  buttonHoverSubtle: '0 4px 16px rgba(0, 201, 234, 0.12)',
};

// Standardized card base styles (mixin)
export const lunitCardBase = {
  bgcolor: '#FFFFFF',
  borderRadius: '20px',
  border: '1px solid rgba(35, 50, 50, 0.08)',
  boxShadow: 'none',
  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: '0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18)',
  },
};
```

---

## 4. Dropdown Navigation Enhancement

### 4.1 Competitive Analysis Summary

| Feature | Current ClinicalVision | Lunit.io | Stripe | Tempus | Linear |
|---------|----------------------|----------|--------|--------|--------|
| **Trigger** | Click | Hover | Hover | Click | Hover |
| **Animation** | MUI Grow default (225ms) / Fade (200ms) | Fade + slideY (250ms) | Morphing container (350ms) | slideDown (400ms) | Fade + scale (180ms) |
| **Shadow** | `0 4px 20px rgba(35,50,50,0.08)` | `0 8px 30px rgba(0,0,0,0.12)` | Multi-layer aggressive | `0 4px 20px rgba(0,0,0,0.08)` | `0 16px 64px rgba(0,0,0,0.6)` |
| **Border-radius** | `12px` | `8px` | `8px` | `0px` | `12px` |
| **Content structure** | Label + description | Label + description | Icon + label + description | Label + description (mega) | Label only |
| **Promotional section** | ❌ None | ❌ None | ✅ Bottom CTA bar | ❌ None | ❌ None |
| **Status badges** | ✅ "Live"/"Coming Soon" | ❌ None | ✅ "New" | ❌ None | ✅ "Beta" |
| **Backdrop overlay** | ❌ None | ❌ None | ❌ None | Subtle dimming | ❌ None |
| **Safe triangle** | ❌ None | ❌ None | ✅ Yes | N/A (click) | ❌ None |
| **Icons** | ❌ None in standard dropdowns | ❌ None | ✅ Colored per-product | ❌ None | ❌ None |
| **Mutual exclusion** | ❌ Multiple can open | ✅ One at a time | ✅ One at a time | ✅ One at a time | ✅ One at a time |

### 4.2 Recommended Architecture: Hybrid Approach

**Trigger Model**: Keep **click-to-open** (medical audience expects deliberate interaction — matches Tempus). But add **hover-intent preview** for desktop (a subtle visual hint that the item has a dropdown).

**Animation Model**: Lunit-style `fade + slideY` with Linear's `scale` snap:
```
Enter: opacity 0→1, translateY(-8px)→0, scale(0.98)→1
  Duration: 250ms
  Easing: cubic-bezier(0.16, 1, 0.3, 1)  — "spring out" feel
  
Exit: opacity 1→0, translateY(0)→-4px
  Duration: 150ms  — faster close than open (feels snappy)
  Easing: ease-in
```

**Mutual Exclusion**: Opening any dropdown should close all others. Currently multiple can be open simultaneously.

### 4.3 Solutions Mega-Dropdown Enhancement

#### Current State
- Two-column Popper with Fade (200ms)
- Left: 4 clinical AI items with emoji icons + status chips
- Right: 2 platform items on tinted background
- Basic hover: `alpha(primaryTeal, 0.06)` background highlight
- No visual hierarchy beyond color

#### Recommended Enhancement

**Layout: Three-Zone Mega Panel**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  CLINICAL AI                           │  PLATFORM                  │
│                                        │                            │
│  ┌─ 🔬 Breast Cancer Detection ────┐   │  ┌─ Clinical Analysis ──┐  │
│  │  AI-powered mammogram analysis  │   │  │  Platform            │  │
│  │  with 96.5% accuracy            │   │  │  Unified analysis    │  │
│  │                    [Available] ●│   │  │  dashboard           │  │
│  └──────────────────────────────────┘   │  └──────────────────────┘  │
│                                        │                            │
│  ┌─ 🫁 Lung Cancer Detection ──────┐   │  ┌─ Pricing & Plans ────┐  │
│  │  CT scan analysis with          │   │  │  Enterprise and      │  │
│  │  nodule classification          │   │  │  institutional       │  │
│  │                [In Development] ○│   │  │  licensing           │  │
│  └──────────────────────────────────┘   │  └──────────────────────┘  │
│                                        │                            │
│  ┌─ 🔎 Prostate Cancer Detection ──┐   │                            │
│  │  Histopathology analysis        │   │                            │
│  │  with Gleason scoring           │   │                            │
│  │                [In Development] ○│   │                            │
│  └──────────────────────────────────┘   │                            │
│                                        │                            │
│  ┌─ 🧬 Colorectal Cancer Detection┐   │                            │
│  │  Polyp detection and            │   │                            │
│  │  classification                 │   │                            │
│  │                [In Development] ○│   │                            │
│  └──────────────────────────────────┘   │                            │
│                                                                     │
│─────────────────────────────────────────────────────────────────────│
│  ✨  Request a personalized demo of our clinical AI platform  →    │
│                                        (Promotional footer bar)     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Specific Style Changes for Solutions Dropdown

```typescript
// Enhanced Paper styles
{
  borderRadius: '16px',  // Upgrade from 12px → 16px (more modern)
  border: `1px solid ${alpha(lunitColors.lightGray, 0.6)}`,
  boxShadow: '0 20px 60px rgba(35, 50, 50, 0.12), 0 4px 20px rgba(35, 50, 50, 0.06)',
    // → More dramatic two-layer shadow (closer to Stripe)
  overflow: 'hidden',  // Needed for bottom CTA bar
  minWidth: '620px',
}

// Individual menu item — card-like treatment
{
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '4px 0',
  border: '1px solid transparent',  // Invisible border, becomes visible on hover
  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  '&:hover': {
    bgcolor: alpha(lunitColors.primaryTeal, 0.04),
    border: `1px solid ${alpha(lunitColors.primaryTeal, 0.12)}`,
    transform: 'translateX(4px)',  // Subtle right-shift on hover
    '& .item-icon': {
      transform: 'scale(1.1)',
      color: lunitColors.primaryTeal,
    },
    '& .item-arrow': {
      opacity: 1,
      transform: 'translateX(0)',
    },
  },
}

// Promotional footer bar (new)
{
  bgcolor: alpha(lunitColors.primaryTeal, 0.04),
  borderTop: `1px solid ${alpha(lunitColors.lightGray, 0.5)}`,
  padding: '14px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    bgcolor: alpha(lunitColors.primaryTeal, 0.08),
  },
}
```

#### Replace Emoji Icons with MUI Icons
Current dropdowns use emoji (🔬, 🫁, 🔎, 🧬). Replace with MUI icons for consistency:
```
Breast Cancer → BiotechOutlined or MedicalServicesOutlined
Lung Cancer → AirOutlined or MonitorHeartOutlined
Prostate Cancer → BiotechOutlined or SearchOutlined
Colorectal Cancer → ScienceOutlined or BiotechOutlined
```
Icons should be rendered in a `40×40px` container with `bgcolor: alpha(lunitColors.primaryTeal, 0.06)` and `borderRadius: '10px'`.

#### Status Badge Enhancement
Current "Available"/"In Development" chips are basic. Upgrade:
```typescript
// Available — Confident green
{
  bgcolor: alpha('#22C55E', 0.08),
  color: '#16A34A',
  border: '1px solid' + alpha('#22C55E', 0.2),
  fontWeight: 600,
  fontSize: '11px',
  letterSpacing: '0.03em',
  borderRadius: '6px',
  padding: '2px 8px',
  // Add subtle pulse dot before text:
  '&::before': {
    content: '""',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    bgcolor: '#22C55E',
    marginRight: '6px',
    animation: 'pulse 2s infinite',  // Gentle breathing pulse
  },
}

// In Development — Amber/orange
{
  bgcolor: alpha('#F59E0B', 0.08),
  color: '#D97706',
  border: '1px solid' + alpha('#F59E0B', 0.2),
  fontWeight: 600,
  fontSize: '11px',
  letterSpacing: '0.03em',
  borderRadius: '6px',
  padding: '2px 8px',
}
```

### 4.4 Standard Dropdown Enhancement (Technology / Resources / Company)

#### Current State
- Basic MUI `<Menu>` with `<MenuItem>` — functional but generic
- White background, 12px radius, light shadow
- Items show label (14px/500) + description (12px, gray)
- No icons, no visual hierarchy, no promotional sections

#### Recommended Enhancement

**1. Add Icons to Every Item**

```
Technology Dropdown:
  AI Models & Architecture → ArchitectureOutlined
  Research & Validation → ScienceOutlined  
  Security & Compliance → SecurityOutlined

Resources Dropdown:
  Documentation → DescriptionOutlined
  API Reference → CodeOutlined
  Insights → InsightsOutlined
  Support → SupportAgentOutlined

Company Dropdown:
  About → InfoOutlined
  Careers → WorkOutlineOutlined
  Partners → HandshakeOutlined
  Events → EventOutlined
  Contact Us → EmailOutlined
```

Each icon rendered in a `36×36px` circle:
```
{
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  bgcolor: alpha(lunitColors.primaryTeal, 0.06),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: lunitColors.primaryTeal,
  transition: 'all 0.25s ease',
  // On item hover:
  '&:hover .icon-container': {
    bgcolor: alpha(lunitColors.primaryTeal, 0.12),
    transform: 'scale(1.05)',
  },
}
```

**2. Enhanced Visual Styling**

```typescript
// Paper container
{
  borderRadius: '16px',  // From 12px
  border: `1px solid ${alpha(lunitColors.lightGray, 0.6)}`,
  boxShadow: '0 20px 60px rgba(35, 50, 50, 0.12), 0 4px 20px rgba(35, 50, 50, 0.06)',
  padding: '8px',
  minWidth: '320px',
  overflow: 'hidden',
}

// Menu item
{
  borderRadius: '12px',
  padding: '12px 16px',
  margin: '2px 0',
  gap: '14px',  // Space between icon and text
  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  '&:hover': {
    bgcolor: alpha(lunitColors.primaryTeal, 0.04),
    transform: 'translateX(4px)',  // Subtle right-push
    '& .chevron-icon': {
      opacity: 1,
      transform: 'translateX(0)',
    },
  },
}

// Add trailing chevron that appears on hover
// Each item gets a → chevron that fades in from left
{
  '& .chevron-icon': {
    opacity: 0,
    transform: 'translateX(-8px)',
    transition: 'all 0.25s ease',
    color: lunitColors.primaryTeal,
    fontSize: '16px',
  },
}
```

**3. Category Headers (for Company dropdown)**

Add a subtle section header above grouped items:
```typescript
{
  fontSize: '11px',
  fontWeight: 600,
  color: lunitColors.mediumGray,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '12px 16px 6px',
  cursor: 'default',
}
```

**4. Bottom Divider + Quick Action**

For Resources dropdown, add a footer link:
```typescript
// Divider
{ borderColor: alpha(lunitColors.lightGray, 0.5), margin: '4px 8px' }

// Footer action
{
  padding: '10px 16px',
  borderRadius: '0 0 12px 12px',
  bgcolor: alpha(lunitColors.primaryTeal, 0.03),
  '&:hover': { bgcolor: alpha(lunitColors.primaryTeal, 0.06) },
  // Text: "View all resources →"
}
```

### 4.5 Dropdown Animation Upgrade

#### Current: MUI Defaults
- Solutions: `<Fade timeout={200}>` — simple opacity transition
- Standard: `<Menu>` default `<Grow>` — 225ms scale+fade from anchor

#### Recommended: Custom Spring-Style Animation

Replace MUI's `<Fade>` and `<Grow>` with a custom `<Slide>` + opacity combination:

```typescript
// For Solutions mega-dropdown — replace <Fade> with custom transition
<Popper
  transition
  // ...existing props
>
  {({ TransitionProps }) => (
    <Grow
      {...TransitionProps}
      style={{
        transformOrigin: 'top center',
      }}
      timeout={{ enter: 250, exit: 150 }}
    >
      <Paper sx={{
        // ... paper styles
        // Animation is handled by Grow
        // But we add custom CSS for the "spring overshoot" feel:
        '@keyframes dropdownEnter': {
          '0%': { opacity: 0, transform: 'translateY(-8px) scale(0.98)' },
          '60%': { opacity: 1, transform: 'translateY(2px) scale(1.005)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        animation: 'dropdownEnter 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}>
        {/* content */}
      </Paper>
    </Grow>
  )}
</Popper>

// For standard dropdowns — customize Menu's TransitionProps
<Menu
  TransitionComponent={Grow}
  TransitionProps={{
    timeout: { enter: 250, exit: 150 },
    style: { transformOrigin: 'top center' },
  }}
  // ...
>
```

#### Staggered Item Animation
Items within the dropdown should animate in with a slight stagger:
```typescript
// Apply to each MenuItem via sx
{
  opacity: 0,
  animation: 'itemSlideIn 200ms ease forwards',
  animationDelay: `${index * 40}ms`,  // 40ms stagger per item
  '@keyframes itemSlideIn': {
    '0%': { opacity: 0, transform: 'translateY(-4px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
}
```
This creates a **cascade** effect — each item appears slightly after the previous one, creating a polished waterfall entrance (Stripe uses this pattern).

### 4.6 Mutual Exclusion Fix

Currently, clicking "Technology" while "Solutions" is open does NOT close "Solutions". Fix:

```typescript
const handleNavOpen = (label: string, el: HTMLElement) => {
  // Close ALL other menus first (mutual exclusion)
  setMenuAnchors({ [label]: el });  // Replace entire object, not spread
};
```

### 4.7 Backdrop Overlay (Optional — High Polish)

When any dropdown is open, add a subtle full-page overlay behind it:
```typescript
// Render when any dropdown is open
{isAnyDropdownOpen && (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      bgcolor: 'rgba(0, 0, 0, 0.03)',
      backdropFilter: 'blur(2px)',
      zIndex: 1199,  // Just below navbar (1200)
      transition: 'all 0.3s ease',
    }}
    onClick={closeAllDropdowns}
  />
)}
```
This is subtle but creates visual focus on the dropdown content. Tempus and Linear both use this pattern.

---

## 5. Implementation Specifications

### 5.1 Design System Additions

Add to `lunitDesignSystem.ts`:

```typescript
// === New shadow variants ===
export const lunitShadows = {
  ...existing,
  // Colored card hover variants
  cardHoverOrange: '0 -3px 0 0 #FF9800, 0 10px 40px rgba(255, 152, 0, 0.15)',
  cardHoverRed: '0 -3px 0 0 #F44336, 0 10px 40px rgba(244, 67, 54, 0.15)',
  cardHoverGreen: '0 -3px 0 0 #22C55E, 0 10px 40px rgba(34, 197, 94, 0.15)',
  // Button hover shadows
  buttonHoverPrimary: '0 6px 20px rgba(0, 201, 234, 0.3)',
  buttonHoverSubtle: '0 4px 16px rgba(0, 201, 234, 0.12)',
  // Dropdown shadows (two-layer)
  dropdown: '0 20px 60px rgba(35, 50, 50, 0.12), 0 4px 20px rgba(35, 50, 50, 0.06)',
};

// === Standardized card base mixin ===
export const lunitCardBase = {
  bgcolor: '#FFFFFF',
  borderRadius: '20px',
  border: `1px solid rgba(35, 50, 50, 0.08)`,
  boxShadow: 'none',
  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: '0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18)',
  },
};

// === Button variant mixins ===
export const lunitButtonPrimary = {
  bgcolor: '#000000',
  color: '#FFFFFF',
  borderRadius: '100px',
  fontWeight: 600,
  fontFamily: '"Lexend", sans-serif',
  letterSpacing: '-0.01em',
  textTransform: 'none' as const,
  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: 'none',
  '&:hover': {
    bgcolor: '#00C9EA',
    color: '#FFFFFF',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(0, 201, 234, 0.3)',
  },
  '&:active': {
    transform: 'translateY(0px) scale(0.98)',
    transition: 'all 0.1s ease',
  },
};

export const lunitButtonOutlined = {
  bgcolor: 'transparent',
  borderRadius: '100px',
  fontWeight: 600,
  fontFamily: '"Lexend", sans-serif',
  letterSpacing: '-0.01em',
  textTransform: 'none' as const,
  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    borderColor: '#00C9EA',
    color: '#00C9EA',
    bgcolor: 'rgba(0, 201, 234, 0.04)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)',
  },
  '&:active': {
    transform: 'translateY(0px) scale(0.98)',
    transition: 'all 0.1s ease',
  },
};

export const lunitButtonAccent = {
  bgcolor: '#00C9EA',
  color: '#FFFFFF',
  borderRadius: '100px',
  fontWeight: 600,
  fontFamily: '"Lexend", sans-serif',
  letterSpacing: '-0.01em',
  textTransform: 'none' as const,
  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    bgcolor: '#0F95AB',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(0, 201, 234, 0.35)',
  },
  '&:active': {
    transform: 'translateY(0px) scale(0.98)',
    bgcolor: '#0D8599',
    transition: 'all 0.1s ease',
  },
};
```

### 5.2 Animation Keyframes to Add

Add to `animations.css` or define inline:

```css
/* Dropdown entrance */
@keyframes dropdownEnter {
  0% { opacity: 0; transform: translateY(-8px) scale(0.98); }
  60% { opacity: 1; transform: translateY(2px) scale(1.005); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* Dropdown item stagger */
@keyframes itemSlideIn {
  0% { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Status badge pulse dot */
@keyframes statusPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Icon container pulse on card hover */
@keyframes iconPulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 201, 234, 0.1); }
  50% { box-shadow: 0 0 0 8px rgba(0, 201, 234, 0.1); }
  100% { box-shadow: 0 0 0 0 rgba(0, 201, 234, 0.1); }
}
```

### 5.3 MUI Icon Imports Needed

```typescript
import {
  // Dropdown item icons
  BiotechOutlined,
  AirOutlined,
  SearchOutlined,
  ScienceOutlined,
  ArchitectureOutlined,
  SecurityOutlined,
  DescriptionOutlined,
  CodeOutlined,
  InsightsOutlined,
  SupportAgentOutlined,
  InfoOutlined,
  WorkOutlineOutlined,
  HandshakeOutlined,
  EventOutlined,
  EmailOutlined,
  ChevronRight,
  // Existing
  ArrowForward,
  ExpandMore,
  CloudDownload,
} from '@mui/icons-material';
```

---

## 6. Mobile Considerations

### 6.1 Touch Targets
All buttons must meet minimum **44×44px** touch target (WCAG 2.1 AA). Currently some nav buttons may be under this threshold at mobile breakpoints.

### 6.2 Card Hover on Mobile
`translateY(-6px)` hover effects should be **disabled on touch devices** to avoid "sticky hover" issues:
```typescript
'@media (hover: hover)': {
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: lunitShadows.cardHoverTeal,
  },
},
// On touch devices, use active/tap state instead:
'@media (hover: none)': {
  '&:active': {
    transform: 'scale(0.98)',
    transition: 'transform 0.1s ease',
  },
},
```

### 6.3 Mobile Dropdown
The mobile drawer is already functional. Enhancement suggestions:
- Add icons to drawer items (same icons as desktop dropdowns)
- Add section dividers with labels ("CLINICAL AI", "PLATFORM")
- Add status badges inline with items

---

## 7. Accessibility Requirements

### 7.1 WCAG 2.1 AA Compliance Checklist

| Requirement | Current Status | Action Needed |
|-------------|---------------|---------------|
| Focus-visible indicator | ❌ No custom focus ring | Add `outline: 2px solid #00C9EA` with `outlineOffset: 3px` |
| Color contrast (buttons) | ✅ Black/white = 21:1, Teal/white ≈ 3.5:1 | ⚠️ Teal-on-white is borderline — use teal on dark bg only, or darken to `#0F95AB` for text |
| Keyboard navigation | ⚠️ Standard MUI Menu has it; Popper doesn't | Add `role="menu"` + `aria-expanded` to Solutions mega-dropdown |
| Motion reduction | ❌ No `prefers-reduced-motion` support | Wrap all transitions in `@media (prefers-reduced-motion: no-preference)` |
| Screen reader | ⚠️ Basic | Add `aria-label` to icon-only buttons, `aria-haspopup` to dropdown triggers |

### 7.2 Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## 8. Priority Matrix

### Phase 1 — Quick Wins (1-2 hours)
| Task | Impact | Effort |
|------|--------|--------|
| Add missing transitions to "View All News" / "View Publications" buttons | 🔴 High | 🟢 5 min |
| Fix "Download Evaluation Package" borderRadius `50px→100px` | 🟡 Medium | 🟢 2 min |
| Add `translateY(-2px)` hover lift to ALL buttons | 🔴 High | 🟡 30 min |
| Add `:active` press effect to ALL buttons | 🔴 High | 🟡 30 min |
| Standardize all transitions to `cubic-bezier(0.4, 0, 0.2, 1)` | 🔴 High | 🟡 20 min |
| Fix mutual exclusion (only one dropdown open at a time) | 🟡 Medium | 🟢 5 min |

### Phase 2 — Card System (1-2 hours)
| Task | Impact | Effort |
|------|--------|--------|
| Add teal glow + `translateY(-6px)` to News Cards | 🔴 High | 🟡 15 min |
| Add teal glow + `translateY(-6px)` to Demo Case Cards (with color variants) | 🔴 High | 🟡 20 min |
| Add teal glow + `translateY(-6px)` to Partner Cards | 🟡 Medium | 🟡 15 min |
| Add subtle hover to StatCards (lift + teal number) | 🟡 Medium | 🟡 15 min |
| Add subtle hover to Testimonial badges | 🟢 Low | 🟢 10 min |
| Add design system tokens (`lunitCardBase`, shadow variants) | 🔴 High | 🟡 15 min |

### Phase 3 — Dropdown Polish (2-3 hours)
| Task | Impact | Effort |
|------|--------|--------|
| Add icons to all standard dropdown items | 🔴 High | 🟡 45 min |
| Upgrade Paper shadow to two-layer (`dropdown` token) | 🟡 Medium | 🟢 10 min |
| Add `translateX(4px)` hover effect to dropdown items | 🟡 Medium | 🟢 15 min |
| Add trailing chevron that appears on hover | 🟡 Medium | 🟡 20 min |
| Replace emoji with MUI icons in Solutions dropdown | 🟡 Medium | 🟡 20 min |
| Add promotional footer bar to Solutions dropdown | 🟡 Medium | 🟡 30 min |
| Upgrade animations (spring entrance, staggered items) | 🟡 Medium | 🔴 45 min |
| Add backdrop overlay | 🟢 Low | 🟢 15 min |

### Phase 4 — Accessibility & Polish (1 hour)
| Task | Impact | Effort |
|------|--------|--------|
| Add `focus-visible` ring to all interactive elements | 🔴 High | 🟡 20 min |
| Add `prefers-reduced-motion` media query | 🟡 Medium | 🟢 10 min |
| Add `aria-expanded`, `aria-haspopup` attributes | 🟡 Medium | 🟢 15 min |
| Mobile touch target audit (44px minimum) | 🟡 Medium | 🟢 15 min |
| Disable hover effects on touch devices | 🟡 Medium | 🟡 20 min |

---

## Appendix A: Enterprise Reference Screenshots

### Stripe Dropdown Anatomy
```
┌──────────────────────────────────────────────────┐
│  ▲ (CSS triangle pointing to nav trigger)        │
│                                                  │
│  PAYMENTS                    FINANCIAL INFRA     │
│                                                  │
│  [🟢] Checkout               [🔵] Connect       │
│  Prebuilt payment page       Payments for        │
│                              platforms            │
│  [🟢] Elements               [🔵] Terminal      │
│  Custom payment UI           In-person payments  │
│                                                  │
│  [🟢] Payment Links         BUSINESS OPERATIONS  │
│  No-code payments                                │
│                              [🟡] Billing       │
│  ────────────────────────     Subscriptions      │
│  Get started with Stripe →                       │
│  ────────────────────────     [🟡] Tax          │
│                              Automated tax       │
│                              compliance          │
└──────────────────────────────────────────────────┘
```

### Lunit Dropdown Anatomy
```
┌───────────────────────────────────┐
│                                   │
│  CANCER SCREENING                 │
│                                   │
│  Lunit INSIGHT MMG               │
│  AI-powered mammography analysis  │
│                                   │
│  Lunit INSIGHT DBT               │
│  3D breast tomosynthesis          │
│                                   │
│  Lunit INSIGHT CXR               │
│  Chest X-ray abnormality         │
│                                   │
│  ─────────────────────           │
│                                   │
│  ECOSYSTEM TOOLS                  │
│                                   │
│  Live  ·  Analytics  ·  Scorecard │
│                                   │
└───────────────────────────────────┘
```

---

## Appendix B: CSS Custom Properties Approach (Future)

For maximum maintainability, consider migrating to CSS custom properties:

```css
:root {
  --cv-btn-transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  --cv-btn-radius: 100px;
  --cv-btn-font-weight: 600;
  --cv-btn-hover-lift: -2px;
  --cv-card-transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  --cv-card-radius: 20px;
  --cv-card-hover-lift: -6px;
  --cv-card-hover-shadow: 0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18);
  --cv-dropdown-radius: 16px;
  --cv-dropdown-shadow: 0 20px 60px rgba(35, 50, 50, 0.12), 0 4px 20px rgba(35, 50, 50, 0.06);
}
```

This would allow runtime theme switching and easier global updates.

---

*End of document. All recommendations are based on competitive analysis of Lunit.io, Stripe, Linear, Tempus, and MUI best practices, tailored for a medical AI diagnostic platform.*
