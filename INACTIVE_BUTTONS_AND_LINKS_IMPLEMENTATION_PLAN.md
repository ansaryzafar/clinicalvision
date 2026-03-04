# Inactive Buttons & Links — Complete Audit & Implementation Plan

> **Audit Date:** June 2025  
> **Scope:** All frontend pages in `clinicalvision_frontend/src/`  
> **Total Dead Interactive Elements:** ~60  
> **Priority:** CRITICAL — These damage user trust and professional credibility

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Issues — Core Navigation](#2-critical-issues--core-navigation)
3. [Critical Issues — Landing Page](#3-critical-issues--landing-page)
4. [Medium Priority — Content Pages](#4-medium-priority--content-pages)
5. [Low Priority — Data Integrity](#5-low-priority--data-integrity)
6. [Implementation Plan](#6-implementation-plan)
7. [Styling & Brand Consistency Notes](#7-styling--brand-consistency-notes)

---

## 1. Executive Summary

A thorough audit of all 22 page components and 2 layout components revealed **~60 dead interactive elements** across the frontend. These fall into three severity tiers:

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 CRITICAL | 14 | Core navigation buttons with no handlers |
| 🟡 MEDIUM | ~42 | Content page links/buttons with no handlers |
| 🟢 LOW | 4+ | Hardcoded/placeholder data |

**Key Findings:**
- **Zero stubs** — All 22 pages are fully implemented with real content
- **Two styling paradigms** are correct: Lunit design system (marketing/public) vs MUI defaults (auth/app-internal)
- Most issues are buttons/links with `cursor: 'pointer'` and hover effects but **no `onClick` or `href`**
- One duplicate `onClick` prop bug causes silent behavior override

---

## 2. Critical Issues — Core Navigation

### 2.1 ModernMainLayout — AppBar Help Button (NO onClick)

| Property | Value |
|----------|-------|
| **File** | `src/components/layout/ModernMainLayout.tsx` |
| **Lines** | 525–538 |
| **Element** | `<IconButton>` wrapped in `<Tooltip title="Help & Documentation">` |
| **Icon** | `<HelpOutline />` |
| **Issue** | No `onClick` handler — button renders, shows tooltip on hover, does nothing on click |

**Current Code:**
```tsx
<Tooltip title="Help & Documentation">
  <IconButton size="medium" sx={{ color: theme.palette.text.secondary, /* ... */ }}>
    <HelpOutline />
  </IconButton>
</Tooltip>
```

**Fix:** Add `onClick` to navigate to the Documentation page:
```tsx
<Tooltip title="Help & Documentation">
  <IconButton size="medium" onClick={() => navigate('/documentation')} sx={{ /* ... */ }}>
    <HelpOutline />
  </IconButton>
</Tooltip>
```

---

### 2.2 ModernMainLayout — Notifications Bell (NO onClick, Fake Badge)

| Property | Value |
|----------|-------|
| **File** | `src/components/layout/ModernMainLayout.tsx` |
| **Lines** | 539–554 |
| **Element** | `<IconButton>` with `<Badge badgeContent={3} color="error" variant="dot">` |
| **Icon** | `<NotificationsNone />` |
| **Issue** | No `onClick` handler. Badge shows hardcoded `badgeContent={3}` — purely cosmetic, not data-driven |

**Fix — Option A (Quick):** Remove the notifications button entirely until real notification infrastructure exists.

**Fix — Option B (Recommended):** Add a notifications dropdown/popover with placeholder content:
```tsx
const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

<IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} /* ... */>
  <Badge badgeContent={0} color="error" variant="dot">
    <NotificationsNone />
  </Badge>
</IconButton>
<Menu anchorEl={notifAnchor} open={Boolean(notifAnchor)} onClose={() => setNotifAnchor(null)}>
  <MenuItem disabled>
    <Typography variant="body2" color="text.secondary">No new notifications</Typography>
  </MenuItem>
</Menu>
```

---

## 3. Critical Issues — Landing Page

### 3.1 Navbar — 4 Dead Navigation Buttons

| Property | Value |
|----------|-------|
| **File** | `src/pages/LandingPage.tsx` |
| **Data Definition** | Lines 227–232 |
| **Rendered Loop** | Lines 306–329 |
| **Elements** | 4 `<Button>` components: Products ▼, Technology, About ▼, Resources ▼ |
| **Issue** | No `onClick` on any button. Dropdown arrows render but no dropdown menus exist |

**Current Data:**
```tsx
const navItems = [
  { label: 'Products', hasDropdown: true },
  { label: 'Technology', hasDropdown: false },
  { label: 'About', hasDropdown: true },
  { label: 'Resources', hasDropdown: true },
];
```

**Fix:** Add route mappings and dropdown menus for items with `hasDropdown: true`:

```tsx
const navItems = [
  {
    label: 'Products',
    hasDropdown: true,
    children: [
      { label: 'Features', path: ROUTES.FEATURES },
      { label: 'Pricing', path: ROUTES.PRICING },
      { label: 'Demo', path: ROUTES.DEMO },
      { label: 'API', path: ROUTES.API },
    ],
  },
  { label: 'Technology', hasDropdown: false, path: ROUTES.FEATURES },
  {
    label: 'About',
    hasDropdown: true,
    children: [
      { label: 'About Us', path: ROUTES.ABOUT },
      { label: 'Careers', path: ROUTES.CAREERS },
      { label: 'Research', path: ROUTES.RESEARCH },
      { label: 'Contact', path: ROUTES.CONTACT },
    ],
  },
  {
    label: 'Resources',
    hasDropdown: true,
    children: [
      { label: 'Documentation', path: ROUTES.DOCUMENTATION },
      { label: 'Blog', path: ROUTES.BLOG },
      { label: 'Support', path: ROUTES.SUPPORT },
      { label: 'System Status', path: ROUTES.STATUS },
    ],
  },
];
```

**Implementation Pattern:**
- Use MUI `<Menu>` / `<Popover>` for dropdown items
- Manage anchor state per nav item: `const [menuAnchor, setMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({})`
- Non-dropdown items (`Technology`) use direct `onClick={() => navigate(item.path)}`
- Dropdown items open a `<Menu>` with `<MenuItem>` entries that navigate on click
- Style menus with Lunit design tokens (dark background, teal hover)

---

### 3.2 Navbar — Dead Mobile Hamburger

| Property | Value |
|----------|-------|
| **File** | `src/pages/LandingPage.tsx` |
| **Lines** | 335–342 |
| **Element** | `<IconButton>` with `<MenuIcon />` |
| **Visibility** | `display: { xs: 'flex', md: 'none' }` (mobile-only) |
| **Issue** | No `onClick` — no drawer, no menu, no state toggle |

**Fix:** Add a mobile navigation drawer:

```tsx
const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

// On the IconButton:
<IconButton onClick={() => setMobileDrawerOpen(true)} /* ... */>
  <MenuIcon />
</IconButton>

// Add Drawer component:
<Drawer
  anchor="right"
  open={mobileDrawerOpen}
  onClose={() => setMobileDrawerOpen(false)}
  PaperProps={{ sx: { width: 280, bgcolor: lunitColors.background } }}
>
  <List>
    {/* All nav items + CTA buttons */}
    <ListItem button onClick={() => { navigate(ROUTES.FEATURES); setMobileDrawerOpen(false); }}>
      <ListItemText primary="Features" />
    </ListItem>
    {/* ... repeat for all nav destinations ... */}
  </List>
</Drawer>
```

---

### 3.3 Footer — 3 Dead Social Links (LandingPage)

| Property | Value |
|----------|-------|
| **File** | `src/pages/LandingPage.tsx` |
| **Lines** | 3542–3558 |
| **Elements** | 3 `<Typography>` elements: LinkedIn, Twitter, GitHub |
| **Issue** | `cursor: 'pointer'` + hover color but no `onClick` or `href` |

**Fix:** Convert to anchor links with real URLs:

```tsx
const socialLinks = [
  { label: 'LinkedIn', url: 'https://linkedin.com/company/clinicalvision' },
  { label: 'Twitter', url: 'https://twitter.com/clinicalvision' },
  { label: 'GitHub', url: 'https://github.com/ansaryzafar/clinicalvision' },
];

{socialLinks.map((social) => (
  <Typography
    key={social.label}
    component="a"
    href={social.url}
    target="_blank"
    rel="noopener noreferrer"
    variant="body2"
    sx={{
      color: lunitColors.darkGrey,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: 'color 0.3s ease',
      '&:hover': { color: lunitColors.tealDarker },
    }}
  >
    {social.label}
  </Typography>
))}
```

---

### 3.4 Footer — 3 Dead Social Links (PageLayout)

| Property | Value |
|----------|-------|
| **File** | `src/components/layout/PageLayout.tsx` |
| **Lines** | 315–344 |
| **Elements** | 3 `<Box>` elements with `<LinkedIn>`, `<Twitter>`, `<GitHub>` icons |
| **Issue** | `cursor: 'pointer'` + hover styling + icon components but no `onClick` or `href` |

**Fix:** Same pattern as LandingPage social links — convert `<Box>` to `<Box component="a">` with `href`, `target="_blank"`, `rel="noopener noreferrer"`.

---

### 3.5 "Request Demo" Button — Duplicate onClick Bug

| Property | Value |
|----------|-------|
| **File** | `src/pages/LandingPage.tsx` |
| **Lines** | 3237 and 3256 |
| **Element** | Single `<Button>` with TWO `onClick` props |
| **First onClick** | `onClick={() => navigate(ROUTES.LOGIN)}` (line 3237) — **DEAD, silently overridden** |
| **Second onClick** | `onClick={() => navigate(ROUTES.DEMO)}` (line 3256) — **This one wins** |

**Fix:** Remove the duplicate. Keep only the correct one (`ROUTES.DEMO` for a "Request Demo" button):
```tsx
<Button
  variant="contained"
  size="large"
  endIcon={<ArrowForward />}
  onClick={() => navigate(ROUTES.DEMO)}
  sx={{ /* ... */ }}
>
  Request Demo
</Button>
```

---

## 4. Medium Priority — Content Pages

### 4.1 DocumentationPage — Visual-Only Search (4 Dead Elements)

| Property | Value |
|----------|-------|
| **File** | `src/pages/DocumentationPage.tsx` |
| **Issue A** | Lines 115–129: Uncontrolled `<input>` — no `value`, no `onChange`, no state binding |
| **Issue B** | Lines 130–147: "Search" `<Button>` — no `onClick` handler |
| **Issue C** | Lines 213–246: 24 documentation category links — `cursor: 'pointer'` + hover but no `onClick` |
| **Issue D** | Lines 286–302: 4 "Popular Guides" cards — `cursor: 'pointer'` + hover but no `onClick` |
| **Total Dead** | 30 interactive elements |

**Fix Strategy:**

**Search (Issues A & B):** Implement client-side filtering:
```tsx
const [searchQuery, setSearchQuery] = useState('');

<Box
  component="input"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Search documentation..."
  sx={{ /* existing styles */ }}
/>
<Button onClick={() => { /* filter categories by searchQuery */ }} sx={{ /* ... */ }}>
  Search
</Button>
```

**Category Links (Issue C):** Since there are no individual doc article routes, two options:
- **Option A (Quick):** Remove `cursor: 'pointer'` and hover effects — make them non-interactive labels
- **Option B (Better):** Navigate to a filtered view or anchor on the same page

**Popular Guide Cards (Issue D):** Same approach — either remove interactive styling or link to relevant sections.

---

### 4.2 BlogPage — Dead Post Navigation (7 Dead Elements)

| Property | Value |
|----------|-------|
| **File** | `src/pages/BlogPage.tsx` |
| **Root Cause** | Lines 72–76: `handlePostClick()` navigates to `/blog#slug` — but no element with matching `id` exists, and no individual blog post routes exist |
| **Affected** | 1 featured post card (line 130) + 6 grid post cards (line 254) = **7 dead clickable elements** |

**Fix Strategy:**

**Option A (Quick — Recommended):** Remove clickable behavior from blog cards since there are no individual blog post pages. Remove `role="button"`, `cursor: 'pointer'`, and `onClick` from the cards. Blog entries become read-only preview cards.

**Option B (Full):** Create a `BlogPostPage.tsx` component with route `/blog/:slug`, and update `handlePostClick` to navigate there. This requires creating new page content for each post.

---

### 4.3 CompliancePage — Dead Download Cards (6 Dead Elements)

| Property | Value |
|----------|-------|
| **File** | `src/pages/CompliancePage.tsx` |
| **Lines** | 380–430 |
| **Elements** | 6 `<Box>` cards: BAA Template, SOC 2 Report, Security Whitepaper, DPA Template, FDA 510(k) Summary, CE Declaration |
| **Issue** | `cursor: 'pointer'` + hover effects but no `onClick`, no `href`, no download URL |

**Fix Strategy:**

**Option A (Quick — Recommended):** Remove interactive styling (`cursor: 'pointer'`, hover effects). Add a note: "Contact sales for compliance documents" with a link to the Contact page.

**Option B (Full):** Add actual downloadable PDFs to `public/docs/` and wire up download handlers:
```tsx
const complianceDocs = [
  { title: 'BAA Template', url: '/docs/baa-template.pdf', type: 'PDF' },
  // ...
];

<Box onClick={() => window.open(doc.url, '_blank')} sx={{ cursor: 'pointer', /* ... */ }}>
```

---

### 4.4 ResearchPage — Placeholder DOIs + Dead DOI Buttons (8 Dead Elements)

| Property | Value |
|----------|-------|
| **File** | `src/pages/ResearchPage.tsx` |
| **Issue A** | Lines 14, 22, 30, 38: 4 DOI values contain `xxxxx` placeholder suffixes |
| **Issue B** | Lines 303–318: 4 DOI `<Button>` elements with `<OpenInNew>` icon — no `onClick`, no `href` |
| **Total Dead** | 8 elements (4 placeholder data + 4 dead buttons) |

**Fix:**

```tsx
// 1. Update DOI values to real or clearly-marked values:
doi: '10.xxxx/pending-publication',  // Or remove DOI display entirely

// 2. Wire up DOI buttons:
<Button
  size="small"
  endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
  onClick={() => window.open(`https://doi.org/${pub.doi}`, '_blank')}
  sx={{ /* existing styles */ }}
>
  DOI: {pub.doi}
</Button>
```

**Recommended:** If papers are not yet published, replace DOI buttons with "Preprint — Coming Soon" labels (non-clickable).

---

## 5. Low Priority — Data Integrity

### 5.1 StatusPage — Fully Hardcoded Data

| Property | Value |
|----------|-------|
| **File** | `src/pages/StatusPage.tsx` |
| **Issue A** | Lines 7–15: 6 services hardcoded as `'operational'` with fixed uptimes |
| **Issue B** | Lines 16–38: 3 incidents hardcoded from Jan 2024 / 2023 (stale) |
| **Issue C** | Lines 40–47: Uptime history hardcoded Aug 2023 – Jan 2024 |
| **Issue D** | Hero subtitle claims "Subscribe for updates" — no subscribe mechanism exists |

**Fix Strategy:**

**Option A (Quick):** Update hardcoded dates to recent values. Add disclaimer: "Status data shown is illustrative." Remove "Subscribe for updates" text.

**Option B (Full):** Integrate with a real status monitoring API (e.g., backend health endpoint). This is a larger effort and likely not needed for demo purposes.

---

### 5.2 CompliancePage — Placeholder FDA Number

| Property | Value |
|----------|-------|
| **File** | `src/pages/CompliancePage.tsx` |
| **Line** | 35 |
| **Issue** | `'510(k) clearance (K123456)'` — obviously fake sequential clearance number |

**Fix:** Replace with: `'510(k) clearance (pending)'` or remove the specific number.

---

## 6. Implementation Plan

### Phase 1 — Critical Navigation Fixes (Estimated: 2–3 hours)

These are the highest-visibility issues affecting core UX:

| # | Task | File | Complexity |
|---|------|------|------------|
| 1 | Wire up 4 navbar buttons with dropdown menus | `LandingPage.tsx` | Medium |
| 2 | Implement mobile hamburger drawer | `LandingPage.tsx` | Medium |
| 3 | Fix duplicate onClick on Request Demo | `LandingPage.tsx` | Trivial |
| 4 | Wire up Help button → `/documentation` | `ModernMainLayout.tsx` | Trivial |
| 5 | Fix Notifications button (popover or remove) | `ModernMainLayout.tsx` | Easy |
| 6 | Wire up 6 social links (LandingPage + PageLayout) | Both files | Easy |

### Phase 2 — Content Page Fixes (Estimated: 1–2 hours)

| # | Task | File | Complexity |
|---|------|------|------------|
| 7 | Remove interactive styling from doc links OR add filtering | `DocumentationPage.tsx` | Easy |
| 8 | Implement search input state + basic filtering | `DocumentationPage.tsx` | Medium |
| 9 | Remove dead click handlers from blog cards | `BlogPage.tsx` | Easy |
| 10 | Remove interactive styling from compliance downloads | `CompliancePage.tsx` | Easy |
| 11 | Fix DOI buttons or replace with "Coming Soon" | `ResearchPage.tsx` | Easy |

### Phase 3 — Data Integrity Cleanup (Estimated: 30 min)

| # | Task | File | Complexity |
|---|------|------|------------|
| 12 | Update StatusPage dates + remove subscribe claim | `StatusPage.tsx` | Trivial |
| 13 | Fix placeholder FDA clearance number | `CompliancePage.tsx` | Trivial |
| 14 | Fix placeholder DOI values | `ResearchPage.tsx` | Trivial |

---

## 7. Styling & Brand Consistency Notes

### Current Design System (Correct — Do Not Change)

| Context | Styling | Wrapper |
|---------|---------|---------|
| Marketing/Public pages | Lunit design system (dark nav, teal accents, `lunitColors.*`) | `<PageLayout>` |
| Landing page | Self-contained Lunit styling | None (standalone) |
| Auth pages (Login, Register, etc.) | Standalone auth styling | None |
| App-internal (Dashboard, Settings, Fairness) | MUI defaults with `theme.palette.*` | `<ModernMainLayout>` |

### Key Lunit Design Tokens to Use in Fixes

```tsx
// Colors
lunitColors.black       // '#1A1A1A' — primary dark
lunitColors.teal         // '#00C4B4' — primary accent
lunitColors.tealDarker   // '#00A89A' — hover accent
lunitColors.text         // '#FFFFFF' — light text on dark
lunitColors.darkGrey     // '#6B7280' — secondary text
lunitColors.lightestGray // '#F9FAFB' — card backgrounds

// Typography
lunitTypography.fontFamilyHeading  // Inter/system
lunitTypography.fontFamilyBody     // Inter/system

// Borders & Radius
lunitRadius.lg  // '12px'
lunitRadius.md  // '8px'

// Shadows
lunitShadows.card  // Subtle elevation
```

### Dropdown Menu Styling (for navbar fix)

New dropdown menus on the Landing page MUST use Lunit tokens:

```tsx
<Menu
  PaperProps={{
    sx: {
      bgcolor: lunitColors.black,
      border: `1px solid ${alpha(lunitColors.text, 0.1)}`,
      borderRadius: lunitRadius.md,
      mt: 1,
      minWidth: 200,
    },
  }}
>
  <MenuItem
    onClick={() => navigate(path)}
    sx={{
      color: lunitColors.text,
      fontFamily: lunitTypography.fontFamilyBody,
      fontSize: '14px',
      py: 1.5,
      '&:hover': {
        bgcolor: alpha(lunitColors.teal, 0.1),
        color: lunitColors.teal,
      },
    }}
  >
    {label}
  </MenuItem>
</Menu>
```

### Mobile Drawer Styling (for hamburger fix)

```tsx
<Drawer
  PaperProps={{
    sx: {
      bgcolor: lunitColors.black,
      color: lunitColors.text,
      width: 300,
    },
  }}
>
```

---

## Appendix: Complete Dead Element Inventory

| # | File | Line(s) | Element | Type | Severity |
|---|------|---------|---------|------|----------|
| 1 | `ModernMainLayout.tsx` | 525–538 | Help IconButton | No onClick | 🔴 |
| 2 | `ModernMainLayout.tsx` | 539–554 | Notifications IconButton | No onClick + fake badge | 🔴 |
| 3 | `LandingPage.tsx` | 306–329 | "Products" Button | No onClick, no dropdown | 🔴 |
| 4 | `LandingPage.tsx` | 306–329 | "Technology" Button | No onClick | 🔴 |
| 5 | `LandingPage.tsx` | 306–329 | "About" Button | No onClick, no dropdown | 🔴 |
| 6 | `LandingPage.tsx` | 306–329 | "Resources" Button | No onClick, no dropdown | 🔴 |
| 7 | `LandingPage.tsx` | 335–342 | Mobile hamburger | No onClick, no drawer | 🔴 |
| 8 | `LandingPage.tsx` | 3542–3558 | LinkedIn social link | No onClick/href | 🔴 |
| 9 | `LandingPage.tsx` | 3542–3558 | Twitter social link | No onClick/href | 🔴 |
| 10 | `LandingPage.tsx` | 3542–3558 | GitHub social link | No onClick/href | 🔴 |
| 11 | `PageLayout.tsx` | 315–344 | LinkedIn social icon | No onClick/href | 🔴 |
| 12 | `PageLayout.tsx` | 315–344 | Twitter social icon | No onClick/href | 🔴 |
| 13 | `PageLayout.tsx` | 315–344 | GitHub social icon | No onClick/href | 🔴 |
| 14 | `LandingPage.tsx` | 3237, 3256 | Request Demo Button | Duplicate onClick (bug) | 🔴 |
| 15 | `DocumentationPage.tsx` | 115–129 | Search input | No value/onChange | 🟡 |
| 16 | `DocumentationPage.tsx` | 130–147 | Search Button | No onClick | 🟡 |
| 17–40 | `DocumentationPage.tsx` | 213–246 | 24 category doc links | No onClick | 🟡 |
| 41–44 | `DocumentationPage.tsx` | 286–302 | 4 popular guide cards | No onClick | 🟡 |
| 45 | `BlogPage.tsx` | 130 | Featured post card | Navigates to self (#slug) | 🟡 |
| 46–51 | `BlogPage.tsx` | 254 | 6 post grid cards | Navigate to self (#slug) | 🟡 |
| 52–57 | `CompliancePage.tsx` | 380–430 | 6 download cards | No onClick/href | 🟡 |
| 58–61 | `ResearchPage.tsx` | 303–318 | 4 DOI buttons | No onClick/href | 🟡 |
| 62 | `StatusPage.tsx` | 7–47 | All status data | Hardcoded/stale | 🟢 |
| 63 | `CompliancePage.tsx` | 35 | FDA number | Placeholder K123456 | 🟢 |
| 64–67 | `ResearchPage.tsx` | 14–38 | 4 DOI values | Placeholder xxxxx | 🟢 |

---

*End of audit. Proceed with Phase 1 implementation first.*
