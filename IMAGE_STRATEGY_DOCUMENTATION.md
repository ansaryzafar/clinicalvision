# 📸 ClinicalVision Image Strategy & Optimization Documentation

> **Date:** March 8, 2026  
> **Scope:** Complete analysis of available image assets, current placeholder audit, optimal placement recommendations, and performance optimization guidelines.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Available Image Inventory](#2-available-image-inventory)
   - 2.1 [Unsplash Stock Images](#21-unsplash-stock-images-31-files)
   - 2.2 [Application Screenshots (User-Provided)](#22-application-screenshots-user-provided)
   - 2.3 [Existing Project Assets](#23-existing-project-assets)
3. [Current Image State Audit](#3-current-image-state-audit)
   - 3.1 [LandingPage.tsx — Placeholder Inventory](#31-landingpagetsx--placeholder-inventory)
   - 3.2 [BlogPage.tsx — Placeholder Inventory](#32-blogpagetsx--placeholder-inventory)
   - 3.3 [Secondary Pages — Image Opportunities](#33-secondary-pages--image-opportunities)
   - 3.4 [External CDN Dependencies](#34-external-cdn-dependencies)
4. [Image Classification & Relevance Analysis](#4-image-classification--relevance-analysis)
   - 4.1 [Tier 1 — Directly Relevant (Medical/Clinical)](#41-tier-1--directly-relevant-medicalclinical)
   - 4.2 [Tier 2 — Technology & AI Visuals](#42-tier-2--technology--ai-visuals)
   - 4.3 [Tier 3 — Abstract/Decorative (Backgrounds)](#43-tier-3--abstractdecorative-backgrounds)
   - 4.4 [Tier 4 — Low Relevance / Excluded](#44-tier-4--low-relevance--excluded)
5. [Recommended Image Placement Map](#5-recommended-image-placement-map)
   - 5.1 [LandingPage Placements](#51-landingpage-placements)
   - 5.2 [BlogPage Placements](#52-blogpage-placements)
   - 5.3 [Secondary Page Placements](#53-secondary-page-placements)
   - 5.4 [Dedicated "Product Showcase" Page (New)](#54-dedicated-product-showcase-page-new)
6. [Screenshot Strategy — Application UI Showcasing](#6-screenshot-strategy--application-ui-showcasing)
7. [Image Optimization & Performance Guidelines](#7-image-optimization--performance-guidelines)
   - 7.1 [Target Sizes by Usage Context](#71-target-sizes-by-usage-context)
   - 7.2 [Format Selection Matrix](#72-format-selection-matrix)
   - 7.3 [Processing Pipeline](#73-processing-pipeline)
   - 7.4 [Lazy Loading & Responsive Strategy](#74-lazy-loading--responsive-strategy)
   - 7.5 [Performance Budget](#75-performance-budget)
8. [File Organization & Naming Convention](#8-file-organization--naming-convention)
9. [Implementation Priority Matrix](#9-implementation-priority-matrix)
10. [Accessibility & Attribution](#10-accessibility--attribution)

---

## 1. Executive Summary

The ClinicalVision frontend currently relies heavily on **gradient placeholders, MUI icon substitutes, and external Unsplash CDN URLs** for imagery. There are **31 downloaded Unsplash stock photos** in the project root and **7 application UI screenshots** (attached by the user) available for deployment.

### Key Findings

| Metric | Count |
|--------|-------|
| Total available unsplash images | 31 |
| Application screenshots available | 7 |
| Placeholder image slots (LandingPage) | **11** |
| Placeholder image slots (BlogPage) | **7** |
| External CDN image dependencies | **2** (should self-host) |
| Pages that could benefit from images | **8+** |
| Images classified as directly relevant | **15** |
| Images recommended for exclusion | **5** |
| Combined raw file size of all images | **~96 MB** |
| Target optimized total size | **~3-5 MB** |

### Critical Actions
1. **Self-host** the 2 external Unsplash URLs currently in LandingPage partner cards
2. **Optimize all images** before deployment (resize + WebP conversion = ~95% size reduction)
3. **Replace 11 LandingPage placeholders** with contextually matched images
4. **Create a dedicated showcase page** for the 7 application UI screenshots
5. **Implement lazy loading** for all below-fold images

---

## 2. Available Image Inventory

### 2.1 Unsplash Stock Images (31 files)

All images reside in `/home/tars/Desktop/final_project/` (project root).

#### Category A: Medical / Laboratory / Clinical (13 images)

| # | Filename | Subject | Dimensions | Size | Orientation |
|---|----------|---------|-----------|------|-------------|
| 1 | `akram-huseyn-fKC9eWRnlGY-unsplash.jpg` | Gloved hand holding a test tube in a lab | 4000×6000 | 2,475 KB | Portrait |
| 2 | `akram-huseyn-Qv8JEwWUhSI-unsplash.jpg` | Gloved hand adjusting a microscope | 4000×6000 | 4,017 KB | Portrait |
| 3 | `amari-shutters-r5by4avLYao-unsplash.jpg` | Scientist in lab coat preparing medical sample | 4000×6000 | 1,128 KB | Portrait |
| 4 | `bioscience-image-library-...UNGLjsAcE-4-unsplash.jpg` | Histology: pine stem cross-section (periderm/cortex) | 3264×1840 | 1,918 KB | Landscape |
| 5 | `cdc-IFpQtennlj8-unsplash.jpg` | CDC lab technician pipetting a sample | 3600×2400 | 753 KB | Landscape |
| 6 | `nathan-rimoux-476mHdnj8dM-unsplash.jpg` | Scientist filtering liquid in laboratory | 4000×6000 | 4,356 KB | Portrait |
| 7 | `national-cancer-institute-2fyeLhUeYpg-unsplash.jpg` | DNA genotyping/sequencing machine (NCI) | 3317×4975 | 2,251 KB | Portrait |
| 8 | `national-cancer-institute-BQGxNnyuFtU-unsplash.jpg` | Female scientist using microscope | 3456×5184 | 2,976 KB | Portrait |
| 9 | `national-cancer-institute-ct10qdGv1hQ-unsplash.jpg` | Female pathologist at microscope (dramatic profile) | 3600×5400 | 3,236 KB | Portrait |
| 10 | `national-cancer-institute-JxoWb7wHqnA-unsplash.jpg` | Female scientist at inverted microscope (cells) | 5400×3510 | 5,236 KB | Landscape |
| 11 | `national-cancer-institute-L7en7Lb-Ovc-unsplash.jpg` | Fluorescence microscopy of colorectal cancer cells | 1920×1920 | 301 KB | Square |
| 12 | `testalize-me-0jE8ynV4mis-unsplash.jpg` | Blood collection tubes (vacutainers, multi-colored) | 8095×5397 | 3,325 KB | Landscape |
| 13 | `vitaly-gariev-8WYkI3cEZm8-unsplash.jpg` | Doctor writing on patient's chart | 3840×2160 | 513 KB | Landscape |

#### Category B: Technology / AI / Digital (9 images)

| # | Filename | Subject | Dimensions | Size | Orientation |
|---|----------|---------|-----------|------|-------------|
| 14 | `boliviainteligente-4CZNvBMJfvc-unsplash.jpg` | Abstract purple wavy fluid art lines | 3840×2400 | 727 KB | Landscape |
| 15 | `conny-schneider-pREq0ns_p_E-unsplash.jpg` | Digital plexus network (nodes + lines, blue) | 1920×948 | 284 KB | Panoramic |
| 16 | `conny-schneider-pREq0ns_p_E-unsplash (1).jpg` | Same plexus net (duplicate, higher res) | 4069×2010 | 867 KB | Panoramic |
| 17 | `conny-schneider-xuTJZ7uD7PI-unsplash.jpg` | Plexus net — abstract digital network/connection | 4069×2160 | 887 KB | Landscape |
| 18 | `d-koi-5nI9N2wNcBU-unsplash.jpg` | 3D molecular structures (H₂O/atoms) on blue | 5000×5000 | 1,239 KB | Square |
| 19 | `igor-omilaev-IsYT5rUuVcs-unsplash.jpg` | AI processor chip on circuit board | 3840×2160 | 1,500 KB | Landscape |
| 20 | `luke-jones-ac6UGoeSUSE-unsplash.jpg` | Abstract data strings forming an eye shape | 4608×2592 | 2,295 KB | Landscape |
| 21 | `luke-jones-tBvF46kmwBw-unsplash.jpg` | Data strings / flowing digital neural network lines | 1920×1080 | 380 KB | Landscape |
| 22 | `logan-voss-ljRA5ETvkbA-unsplash.jpg` | Blue radiating light lines (speed/convergence) | 7680×4320 | 19,591 KB | Landscape |

#### Category C: Abstract / Decorative (7 images)

| # | Filename | Subject | Dimensions | Size | Orientation |
|---|----------|---------|-----------|------|-------------|
| 23 | `anh-tuan-to-F2FIM5HJogk-unsplash.jpg` | Green/yellow abstract light trails | 5184×3456 | 3,916 KB | Landscape |
| 24 | `fanni-dmtr-kW6nS7t2QeE-unsplash.jpg` | Blue/purple abstract flowing wave lines | 5760×3240 | 2,353 KB | Landscape |
| 25 | `nina-snixPaBvfBo-unsplash.jpg` | Abstract wave light pattern (black bg) | 6000×4000 | 2,443 KB | Landscape |
| 26 | `oleg-illarionov-iTG1FfVIfPM-unsplash.jpg` | Vertical light streaks (fiber optic style) | 1920×1280 | 440 KB | Landscape |
| 27 | `scott-webb-6O7Qzosi3wI-unsplash.jpg` | Acrylic pour art (purple/white organic cells) | 3000×2001 | 2,365 KB | Landscape |
| 28 | `solen-feyissa-KCcn24_zBaw-unsplash.jpg` | Abstract colorful light painting streaks | 2735×4100 | 1,470 KB | Portrait |
| 29 | `solen-feyissa-yM-v22OIq3I-unsplash.jpg` | Red/blue light painting trails | 2735×4100 | 1,536 KB | Portrait |

#### Category D: Excluded (2 images — not contextually relevant)

| # | Filename | Subject | Reason for Exclusion |
|---|----------|---------|---------------------|
| 30 | `logan-voss-KA9z3pO8zSU-unsplash.jpg` | Pink/white fluid abstract art (iPhone wallpaper) | 21 MB raw file; too abstract/artistic; pink palette conflicts with brand |
| 31 | `sylwia-bartyzel-GL4bT84JdNg-unsplash.jpg` | Dark room with light line installation (Copenhagen art) | Too artistic/experimental; no medical or tech relevance |

---

### 2.2 Application Screenshots (User-Provided)

These are actual screenshots of the ClinicalVision analysis interface, provided by the user as attachments. They showcase **real features** of the medical imaging platform.

| # | Screenshot Content | Suggested Filename | Estimated Dimensions | Priority |
|---|-------------------|-------------------|---------------------|----------|
| S1 | **Malignancy Risk Panel** — Risk gauge (LOW, 18.6%), probability percentage, model confidence (81%), prediction uncertainty (±0%) | `screenshot-malignancy-risk-panel.png` | ~260×350 | ⭐⭐⭐ |
| S2 | **BI-RADS Assessment Panel** — BI-RADS 4B score, HIGH badge (10-49%), "Suspicious - Moderate", recommended action biopsy | `screenshot-birads-assessment.png` | ~260×250 | ⭐⭐⭐ |
| S3 | **Finding Detail Panel (Finding 1)** — Score 90, HIGH PRIORITY, anatomical location (LIQ, clock 1:02, posterior, ~190mm), lesion measurements (69.5mm longest, 31.1×62.2mm, 19.34cm², elongated) | `screenshot-finding-detail-1.png` | ~260×550 | ⭐⭐⭐ |
| S4 | **Finding Detail Panel (Finding 2)** — Score 79, HIGH PRIORITY, LIQ, clock 2:10, posterior, ~73mm, moderate lesion (17.3mm, 13.3×11.0mm, oval) | `screenshot-finding-detail-2.png` | ~260×500 | ⭐⭐ |
| S5 | **Clinical Recommendations Panel** — ACR BI-RADS guidelines, tissue diagnosis (biopsy), image-guided core needle biopsy, multidisciplinary consultation; Actions: View Full Report, Compare Views | `screenshot-clinical-recommendations.png` | ~260×300 | ⭐⭐⭐ |
| S6 | **Full Analysis Interface** — Complete view: navbar, GradCAM++ attention bar, Medical Image Viewer (with presets, view modes, sliders), mammogram with heatmap overlay, right sidebar (malignancy 82.3%, BI-RADS 4C CRITICAL, findings list) | `screenshot-full-analysis-interface.png` | ~1536×768 | ⭐⭐⭐⭐⭐ |
| S7 | **Measurement & Grid View** — Zoomed mammogram with GradCAM++ blend, measurement tools (48.8px/4.9mm, 73.8px/7.4mm), green grid overlay, bottom toolbar | `screenshot-measurement-grid-view.png` | ~1366×768 | ⭐⭐⭐⭐ |

---

### 2.3 Existing Project Assets

| Asset | Location | Purpose |
|-------|----------|---------|
| `clinicalvision-logo.svg` | `public/images/` | Full logo (navbar, footer) |
| `clinicalvision-icon.svg` | `public/images/` | Compact icon (favicon contexts) |
| `logo192.png` / `logo512.png` | `public/` | PWA manifest icons |
| Demo mammogram PNGs (10 files) | `public/demo-data/` | Clinical demo workflow images |

---

## 3. Current Image State Audit

### 3.1 LandingPage.tsx — Placeholder Inventory

| # | Section | Line(s) | Current State | Urgency |
|---|---------|---------|---------------|---------|
| P1 | **Hero Background** | ~1010 | Comment: `/* Background gradient - replaces missing image */`. Radial gradients + inline SVG waves. | 🔴 Critical |
| P2 | **Reimagining Section (dark)** — Mobile Image | ~1750-1800 | `350×480px` Box with grid lines, pulse rings, centered `<Biotech>` icon. Clearly a placeholder for a product visual. | 🔴 Critical |
| P3 | **"From Black Box to Glass Box" Technology Hero** | ~1988 | Comment: `/* Gradient background - replaces missing image */`. Dark section background. | 🟡 Medium |
| P4 | **Partner Card 1** | ~2809 | External Unsplash CDN URL: `photo-1576091160399-112ba8d25d1f` (hospital scene). **Works but depends on external server.** | 🟡 Self-host |
| P5 | **Partner Card 2** | ~2961 | External Unsplash CDN URL: `photo-1532187863486-abf9dbad1b69` (lab/science). **Same concern.** | 🟡 Self-host |
| P6 | **Testimonial Avatar 1** (Dr. Sarah Chen) | ~3360 | `92×92px` box with `<BiotechOutlined>` icon, teal-tinted bgcolor | 🟠 High |
| P7 | **Testimonial Avatar 2** (Dr. Marcus Williams) | ~3420 | `92×92px` box with `<TrendingUp>` icon, orange-tinted bgcolor | 🟠 High |
| P8 | **Testimonial Avatar 3** (Dr. Aisha Patel) | ~3490 | `92×92px` box with `<Biotech>` icon, purple-tinted bgcolor | 🟠 High |
| P9 | **Investor Section Image** | ~3756-3788 | `TrendingUp` icon (120px) inside `4:3 aspect ratio` dark box. | 🟡 Medium |
| P10 | **News Card 1** (Cancer Screening) | ~4030 | 240px gradient with category letter watermark "C" | 🟡 Medium |
| P11 | **News Card 2** (Precision Oncology) | ~4030 | 240px gradient with category letter watermark "P" | 🟡 Medium |
| P12 | **News Card 3** (Research) | ~4030 | 240px gradient with category letter watermark "R" | 🟡 Medium |

### 3.2 BlogPage.tsx — Placeholder Inventory

| # | Section | Line(s) | Current State | Urgency |
|---|---------|---------|---------------|---------|
| B1 | **Featured Post Image** | ~150-165 | `300px min-width` box with teal gradient, centered text "Featured" | 🟠 High |
| B2-B7 | **Post Card Thumbnails (×6)** | ~276-290 | `140px height` box with `lightestGray` bg, centered text "Blog" | 🟡 Medium |

### 3.3 Secondary Pages — Image Opportunities

| Page | Current State | Image Opportunity | Priority |
|------|---------------|-------------------|----------|
| **TechnologyPage** | Icons/cards only | Hero could use AI chip or network visual | 🟢 Low |
| **ResearchPage** | Text + timeline | Hero with microscope/lab imagery | 🟢 Low |
| **CareersPage** | Icons + text marquee | Team photos, hospital partner logos | 🟢 Low |
| **AboutPage** | Gradient hero | Team/lab photo background | 🟢 Low |
| **PartnersPage** | Icon cards | Partner institution logos | 🟢 Low |
| **EventsPage** | Text cards | Event/conference photos | 🟢 Low |
| **NotFoundPage** | Plain "404" text | Fun illustration | 🟢 Low |

### 3.4 External CDN Dependencies

These MUST be self-hosted to eliminate runtime dependency on Unsplash's CDN:

| Current URL | Content | Risk |
|-------------|---------|------|
| `images.unsplash.com/photo-1576091160399-112ba8d25d1f` | Hospital/medical setting | CDN downtime = broken image |
| `images.unsplash.com/photo-1532187863486-abf9dbad1b69` | Lab/science setting | CDN downtime = broken image |

**Action:** Download and self-host in `public/images/`, or replace with one of the downloaded unsplash images.

---

## 4. Image Classification & Relevance Analysis

### 4.1 Tier 1 — Directly Relevant (Medical/Clinical)

**These images directly represent what ClinicalVision does — medical diagnostics, laboratory science, pathology, and clinical practice.**

| Filename | Relevance Score | Best Use Case |
|----------|----------------|---------------|
| `national-cancer-institute-JxoWb7wHqnA-unsplash.jpg` | ⭐⭐⭐⭐⭐ | **Partner Card 1** or **Blog Featured** — Scientist at microscope studying cells. Directly aligns with ClinicalVision's diagnostic AI story. Landscape orientation fits card layouts perfectly. |
| `national-cancer-institute-ct10qdGv1hQ-unsplash.jpg` | ⭐⭐⭐⭐⭐ | **Partner Card 2** or **Testimonial backdrop** — Dramatic pathologist profile. Cinematic quality conveys clinical authority. |
| `national-cancer-institute-BQGxNnyuFtU-unsplash.jpg` | ⭐⭐⭐⭐⭐ | **About Page hero** or **Blog post thumbnail** — Female scientist at microscope. Represents the clinical end-user persona. |
| `national-cancer-institute-L7en7Lb-Ovc-unsplash.jpg` | ⭐⭐⭐⭐⭐ | **Blog thumbnail (Research category)** or **Technology section** — Fluorescence microscopy of cancer cells. DIRECTLY represents what the AI analyzes. Square format = perfect for thumbnails. Small file (301KB). |
| `national-cancer-institute-2fyeLhUeYpg-unsplash.jpg` | ⭐⭐⭐⭐ | **Technology Page hero** or **Research Page** — DNA sequencing machine. Shows the genomics/precision medicine angle. |
| `cdc-IFpQtennlj8-unsplash.jpg` | ⭐⭐⭐⭐ | **Blog thumbnail** or **News Card** — Clean, professional lab pipetting. Already small-ish file (753KB). Landscape. |
| `vitaly-gariev-8WYkI3cEZm8-unsplash.jpg` | ⭐⭐⭐⭐ | **Investor Section** — Doctor writing on patient chart. Represents clinical deployment/adoption. Small file (513KB). Landscape. |
| `testalize-me-0jE8ynV4mis-unsplash.jpg` | ⭐⭐⭐⭐ | **News Card (Cancer Screening)** — Colorful blood collection tubes. Visually striking, medically relevant. |
| `akram-huseyn-Qv8JEwWUhSI-unsplash.jpg` | ⭐⭐⭐ | **Blog thumbnail (Clinical Education)** — Hands adjusting microscope. Portrait orientation limits card usage. |
| `amari-shutters-r5by4avLYao-unsplash.jpg` | ⭐⭐⭐ | **Careers Page** or **About Page** — Scientist preparing samples. Represents the team/research angle. |
| `nathan-rimoux-476mHdnj8dM-unsplash.jpg` | ⭐⭐⭐ | **Blog thumbnail (Technology)** — Scientist filtering in lab. Portrait limits usage. |
| `akram-huseyn-fKC9eWRnlGY-unsplash.jpg` | ⭐⭐⭐ | **Blog thumbnail** — Hand holding test tube. Classic medical imagery. Portrait orientation. |

### 4.2 Tier 2 — Technology & AI Visuals

**These images convey AI, data, connectivity, and technology — key brand themes.**

| Filename | Relevance Score | Best Use Case |
|----------|----------------|---------------|
| `igor-omilaev-IsYT5rUuVcs-unsplash.jpg` | ⭐⭐⭐⭐⭐ | **Technology Page hero** or **Product Visual placeholder** — AI chip on circuit board. Perfectly represents AI/ML infrastructure. Landscape, 1500KB. |
| `luke-jones-ac6UGoeSUSE-unsplash.jpg` | ⭐⭐⭐⭐⭐ | **Hero section background** — Data strings forming an eye. Powerful metaphor: AI "seeing" diagnostic patterns. Landscape. |
| `conny-schneider-pREq0ns_p_E-unsplash.jpg` | ⭐⭐⭐⭐ | **Section background (dark sections)** — Digital plexus network. Already small (284KB). Panoramic aspect ratio perfect for full-width banners. |
| `conny-schneider-xuTJZ7uD7PI-unsplash.jpg` | ⭐⭐⭐⭐ | **"From Black Box to Glass Box" background** — Blue network nodes. Visually maps to neural network / explainable AI concept. |
| `d-koi-5nI9N2wNcBU-unsplash.jpg` | ⭐⭐⭐⭐ | **Research Page** or **Molecular/biotech section** — 3D molecular structures. Medical + tech crossover aesthetic. |
| `luke-jones-tBvF46kmwBw-unsplash.jpg` | ⭐⭐⭐ | **Blog thumbnail (Technology category)** — Abstract digital neural network. Already 380KB, 1920×1080. Performance-friendly. |
| `logan-voss-ljRA5ETvkbA-unsplash.jpg` | ⭐⭐⭐ | **Full-width divider / parallax background** — Blue radiating light. Very large (19MB) — needs heavy optimization. |

### 4.3 Tier 3 — Abstract/Decorative (Backgrounds)

**Useful for section backgrounds, subtle textures, and visual variety but not primary content images.**

| Filename | Relevance Score | Best Use Case |
|----------|----------------|---------------|
| `boliviainteligente-4CZNvBMJfvc-unsplash.jpg` | ⭐⭐⭐ | **Section divider or hero overlay** — Purple wavy fluid art. Could complement dark sections with color. |
| `fanni-dmtr-kW6nS7t2QeE-unsplash.jpg` | ⭐⭐ | **Background texture** — Blue/purple flowing waves. Pretty but generic. |
| `nina-snixPaBvfBo-unsplash.jpg` | ⭐⭐ | **Dark section background** — Abstract wave on black. Could enhance reimagining section. |
| `oleg-illarionov-iTG1FfVIfPM-unsplash.jpg` | ⭐⭐ | **Decorative accent** — Vertical light streaks. Small (440KB). |
| `scott-webb-6O7Qzosi3wI-unsplash.jpg` | ⭐⭐ | **Blog thumbnail** — Acrylic pour art (resembles cell structures). Purple palette aligns with brand accents. |
| `solen-feyissa-KCcn24_zBaw-unsplash.jpg` | ⭐ | **Background texture only** — Portrait light painting. Limited usage due to orientation. |
| `solen-feyissa-yM-v22OIq3I-unsplash.jpg` | ⭐ | **Background texture only** — Red/blue light trails. Limited. |
| `anh-tuan-to-F2FIM5HJogk-unsplash.jpg` | ⭐ | **Not recommended** — Green/yellow light trails feel off-brand. |

### 4.4 Tier 4 — Low Relevance / Excluded

| Filename | Reason for Exclusion |
|----------|---------------------|
| `logan-voss-KA9z3pO8zSU-unsplash.jpg` | 21 MB raw; pink fluid art; palette conflict; no medical/tech relevance |
| `sylwia-bartyzel-GL4bT84JdNg-unsplash.jpg` | Dark art installation; no brand alignment |
| `conny-schneider-pREq0ns_p_E-unsplash (1).jpg` | Duplicate of `pREq0ns_p_E-unsplash.jpg` (higher res) — keep one only |
| `bioscience-image-library-...UNGLjsAcE-4-unsplash.jpg` | Pine stem histology — botanical, not human medical. Misleading in cancer context. |

---

## 5. Recommended Image Placement Map

### 5.1 LandingPage Placements

| Placeholder | Recommended Image | Rationale | Optimized Target |
|-------------|------------------|-----------|-----------------|
| **P1: Hero Background** | `luke-jones-ac6UGoeSUSE-unsplash.jpg` (data strings forming eye) | Powerful metaphor: AI "vision" in diagnostics. The eye shape formed by data filaments instantly communicates the product's purpose. Dark background matches hero's dark overlay. | 1920×1080, WebP, ~80KB |
| **P2: Product Visual** (350×480 Biotech icon box) | **Screenshot S6** (`screenshot-full-analysis-interface.png`) | Show the ACTUAL product instead of an icon placeholder. The full analysis interface with mammogram + heatmap + sidebar is the most compelling product image. | 700×960 (2x retina), WebP, ~120KB |
| **P3: "From Black Box to Glass Box" Background** | `conny-schneider-xuTJZ7uD7PI-unsplash.jpg` (plexus network, blue) | Neural network visualization directly maps to "explainable AI" / glass box concept. Blue nodes = data transparency. | 1920×1080, WebP, ~100KB |
| **P4: Partner Card 1** (replace external URL) | `national-cancer-institute-JxoWb7wHqnA-unsplash.jpg` (scientist at microscope) | Self-hosted replacement for external CDN. Scientist studying cells = clinical research partnership. Landscape fits card layout. | 1200×780, WebP, ~80KB |
| **P5: Partner Card 2** (replace external URL) | `national-cancer-institute-ct10qdGv1hQ-unsplash.jpg` (pathologist at microscope) | Self-hosted replacement. Dramatic clinical imagery conveys diagnostic authority. | 1200×780, WebP, ~80KB |
| **P6: Testimonial Avatar 1** (Dr. Sarah Chen) | `national-cancer-institute-BQGxNnyuFtU-unsplash.jpg` (cropped face region) | Female scientist at microscope — represents a radiologist persona. Crop to head/shoulders for avatar. | 184×184 (2x retina), WebP, ~15KB |
| **P7: Testimonial Avatar 2** (Dr. Marcus Williams) | `vitaly-gariev-8WYkI3cEZm8-unsplash.jpg` (cropped to doctor) | Doctor at work — represents clinical leadership. Crop appropriately. | 184×184, WebP, ~15KB |
| **P8: Testimonial Avatar 3** (Dr. Aisha Patel) | `amari-shutters-r5by4avLYao-unsplash.jpg` (cropped face region) | Scientist in lab coat — represents medical research officer. Crop to avatar. | 184×184, WebP, ~15KB |
| **P9: Investor Section Image** | `igor-omilaev-IsYT5rUuVcs-unsplash.jpg` (AI chip) | AI hardware represents technology investment/infrastructure scaling. Fits the "investor" framing of growth in AI healthcare. | 1100×825 (4:3), WebP, ~90KB |
| **P10: News Card 1** (Cancer Screening) | `testalize-me-0jE8ynV4mis-unsplash.jpg` (blood collection tubes) | Colorful medical tubes = screening/diagnostics. Visually striking, topically relevant. | 800×480, WebP, ~50KB |
| **P11: News Card 2** (Precision Oncology) | `national-cancer-institute-L7en7Lb-Ovc-unsplash.jpg` (fluorescence cancer cells) | ACTUAL cancer cell imagery — directly represents precision oncology research. | 800×480, WebP, ~40KB |
| **P12: News Card 3** (Research) | `cdc-IFpQtennlj8-unsplash.jpg` (lab pipetting) | Clean lab work = published research. Professional, unambiguous medical imagery. | 800×480, WebP, ~40KB |

### 5.2 BlogPage Placements

| Placeholder | Recommended Image | Rationale | Optimized Target |
|-------------|------------------|-----------|-----------------|
| **B1: Featured Post** ("AI Transforming Breast Cancer Screening") | `national-cancer-institute-JxoWb7wHqnA-unsplash.jpg` or **Screenshot S6** | Either the scientist at microscope or the full analysis UI — both powerfully illustrate the featured article topic. | 600×400, WebP, ~50KB |
| **B2: Post "BI-RADS Categories"** | **Screenshot S2** (`screenshot-birads-assessment.png`) | The actual BI-RADS panel from our software — directly illustrates the article topic. | 420×280, WebP, ~30KB |
| **B3: Post "97.5% Sensitivity Study"** | `national-cancer-institute-L7en7Lb-Ovc-unsplash.jpg` (fluorescence cells) | Microscopic cancer cells = validation research imagery. | 420×280, WebP, ~30KB |
| **B4: Post "Integrating AI Workflow"** | `igor-omilaev-IsYT5rUuVcs-unsplash.jpg` (AI chip) | Technology integration = AI hardware. | 420×280, WebP, ~30KB |
| **B5: Post "Uncertainty Quantification"** | **Screenshot S1** (`screenshot-malignancy-risk-panel.png`) | Our uncertainty UI (confidence %, uncertainty ±%) directly illustrates the article concept. | 420×280, WebP, ~25KB |
| **B6: Post "Patient Perspectives"** | `vitaly-gariev-8WYkI3cEZm8-unsplash.jpg` (doctor with patient chart) | Doctor-patient interaction represents patient experience. | 420×280, WebP, ~30KB |
| **B7: Post "RSNA Takeaways"** | `d-koi-5nI9N2wNcBU-unsplash.jpg` (molecular structures) or `conny-schneider-xuTJZ7uD7PI-unsplash.jpg` | Conference/innovation imagery. | 420×280, WebP, ~30KB |

### 5.3 Secondary Page Placements

| Page | Section | Recommended Image | Priority |
|------|---------|------------------|----------|
| **TechnologyPage** | Hero background | `conny-schneider-pREq0ns_p_E-unsplash.jpg` (plexus network) | Low |
| **ResearchPage** | Hero background | `national-cancer-institute-2fyeLhUeYpg-unsplash.jpg` (DNA sequencing) | Low |
| **AboutPage** | Hero background | `cdc-IFpQtennlj8-unsplash.jpg` (lab pipetting) or `national-cancer-institute-BQGxNnyuFtU-unsplash.jpg` | Low |
| **CareersPage** | Team section | `amari-shutters-r5by4avLYao-unsplash.jpg` (scientist in lab coat) | Low |
| **EventsPage** | Event card backgrounds | `d-koi-5nI9N2wNcBU-unsplash.jpg` (molecular) | Low |

### 5.4 Dedicated "Product Showcase" Page (New)

The 7 application screenshots are **too valuable** to scatter sparsely. They should anchor a **dedicated showcase/features page** or a section within the existing Features or Technology page. Recommended structure:

#### Proposed Layout: "See ClinicalVision in Action"

| Section | Screenshots Used | Content |
|---------|-----------------|---------|
| **Hero: Full Analysis Interface** | S6 (full interface) | Full-width hero showing the complete analysis workspace. "See how ClinicalVision empowers clinicians." |
| **Feature 1: Intelligent Risk Assessment** | S1 (malignancy risk) + S2 (BI-RADS) | Side-by-side panels showing how the AI quantifies risk with confidence intervals and maps to standardized BI-RADS categories. |
| **Feature 2: Detailed Findings Analysis** | S3 (finding 1) + S4 (finding 2) | Demonstrate multi-finding detection with anatomical localization, lesion measurements, and priority scoring. |
| **Feature 3: Clinical Decision Support** | S5 (clinical recommendations) | Show how the system provides actionable next-step recommendations based on ACR guidelines. |
| **Feature 4: Precision Measurement Tools** | S7 (measurement & grid view) | Demonstrate the measurement toolkit with GradCAM++ attention visualization and grid overlay for precise lesion sizing. |

This showcase can be a dedicated route (e.g., `/features/showcase`) or integrated as a scrollable section within the existing Features page.

---

## 6. Screenshot Strategy — Application UI Showcasing

### Design Principles for Screenshot Display

1. **Device Framing**: Wrap screenshots in subtle browser/device frames to distinguish them from the page's own UI
2. **Dark backgrounds**: Screenshots have dark themes — display them on slightly lighter dark backgrounds (`#1a2332` or similar) with subtle border/glow to separate from page background
3. **Annotation overlays**: Add subtle callout arrows or numbered indicators pointing to key features
4. **Progressive disclosure**: Start with the full interface (S6), then zoom into individual panels as the user scrolls
5. **Interactive lightbox**: Click-to-zoom with smooth animation for detail inspection

### Panel Screenshot Groupings

```
┌─────────────────────────────────────────────────────────┐
│  FULL ANALYSIS INTERFACE (S6) — Full-width hero         │
│  "The complete diagnostic workspace"                     │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐
│  RISK ASSESSMENT │  │  BI-RADS PANEL   │
│  (S1)            │  │  (S2)            │
│  Malignancy %    │  │  Category score  │
│  Confidence      │  │  Action needed   │
└──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│  FINDING 1 (S3)  │  │  FINDING 2 (S4)  │
│  Score: 90       │  │  Score: 79       │
│  Measurements    │  │  Measurements    │
└──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌─────────────────────────────────┐
│  RECOMMENDATIONS │  │  MEASUREMENT TOOLS (S7)          │
│  (S5)            │  │  GradCAM++ with grid + rulers    │
│  Biopsy pathway  │  │                                  │
└──────────────────┘  └─────────────────────────────────┘
```

---

## 7. Image Optimization & Performance Guidelines

### 7.1 Target Sizes by Usage Context

| Usage Context | Max Rendered Width | Retina Target | Format | Quality | Max File Size |
|---------------|-------------------|---------------|--------|---------|--------------|
| **Hero background** (full-width) | 1920px | 1920×1080 | WebP | 75-80% | **100 KB** |
| **Section background** (dark overlay) | 1920px | 1920×1080 | WebP | 60-70% (lossy OK — behind overlay) | **80 KB** |
| **Partner/Feature cards** (50% width) | 600px | 1200×780 | WebP | 80% | **80 KB** |
| **Blog thumbnails** (card images) | 420px | 840×560 | WebP | 80% | **40 KB** |
| **News card images** (1/3 width) | 400px | 800×480 | WebP | 80% | **50 KB** |
| **Testimonial avatars** (92px circle) | 92px | 184×184 | WebP | 85% | **15 KB** |
| **Product screenshots** (retina display) | 700px | 1400×960 | WebP / PNG | 85% | **150 KB** |
| **Full-width screenshots** (showcase) | 1440px | 2880×1620 | WebP | 85% | **200 KB** |
| **UI panel screenshots** (sidebar panels) | 300px | 600×800 | PNG (sharp text) | 90% | **80 KB** |

### 7.2 Format Selection Matrix

| Content Type | Primary Format | Fallback | Rationale |
|-------------|---------------|----------|-----------|
| Photographs (stock photos) | **WebP** | JPEG | WebP = 25-35% smaller than JPEG at same quality |
| Screenshots with text | **PNG** → **WebP** (lossless) | PNG | Text needs sharp edges; lossy WebP may blur UI text |
| Decorative backgrounds (behind overlays) | **WebP** (lossy, low quality) | JPEG | Background images behind CSS overlays can be aggressively compressed |
| Hero images (above the fold) | **WebP** with `<picture>` fallback | JPEG | Critical rendering path — serve optimized format per browser |
| Logos/Icons | **SVG** | PNG@2x | Already using SVG ✅ |

### 7.3 Processing Pipeline

Recommended command-line processing for all images before deployment:

```bash
# Step 1: Resize to target dimensions (maintains aspect ratio)
# Using ImageMagick or sharp/squoosh CLI

# For hero backgrounds (1920px wide):
convert input.jpg -resize 1920x -quality 80 output-hero.jpg
cwebp output-hero.jpg -q 78 -o output-hero.webp

# For card images (1200px wide):
convert input.jpg -resize 1200x -quality 82 output-card.jpg
cwebp output-card.jpg -q 80 -o output-card.webp

# For thumbnails (840px wide for 2x retina):
convert input.jpg -resize 840x -quality 82 output-thumb.jpg
cwebp output-thumb.jpg -q 80 -o output-thumb.webp

# For avatars (184×184 square crop):
convert input.jpg -resize 184x184^ -gravity center -crop 184x184+0+0 +repage output-avatar.jpg
cwebp output-avatar.jpg -q 85 -o output-avatar.webp

# Step 2: Generate responsive variants
# 1x, 2x, and srcset-ready sizes
for size in 640 960 1280 1920; do
  convert input.jpg -resize ${size}x -quality 80 output-${size}w.jpg
  cwebp output-${size}w.jpg -q 78 -o output-${size}w.webp
done
```

### 7.4 Lazy Loading & Responsive Strategy

```tsx
// ✅ Recommended: Native lazy loading + responsive srcset
<picture>
  <source
    type="image/webp"
    srcSet="/images/hero-640w.webp 640w, /images/hero-960w.webp 960w, /images/hero-1920w.webp 1920w"
    sizes="100vw"
  />
  <img
    src="/images/hero-1920w.jpg"
    srcSet="/images/hero-640w.jpg 640w, /images/hero-960w.jpg 960w, /images/hero-1920w.jpg 1920w"
    sizes="100vw"
    loading="lazy"  // Omit for above-the-fold hero
    decoding="async"
    alt="AI-powered diagnostic analysis visualization"
    style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
  />
</picture>

// ✅ For background images via CSS:
// Use backgroundImage with media queries for responsive backgrounds
sx={{
  backgroundImage: {
    xs: `url('/images/section-bg-640w.webp')`,
    md: `url('/images/section-bg-1280w.webp')`,
    lg: `url('/images/section-bg-1920w.webp')`,
  },
}}
```

**Loading Strategy by Position:**

| Position | Loading Strategy | Priority |
|----------|-----------------|----------|
| Hero (above fold) | `loading="eager"`, `fetchpriority="high"` | Preload in `<head>` |
| First viewport section | `loading="eager"` | Normal |
| Below fold sections | `loading="lazy"`, `decoding="async"` | Deferred |
| Far below fold (news, footer) | `loading="lazy"` | Lowest |

### 7.5 Performance Budget

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Total image weight per page** | ≤ 500 KB | Keeps LCP under 2.5s on 3G |
| **Hero image** | ≤ 100 KB | Critical rendering path |
| **Individual card images** | ≤ 80 KB each | Multiple on screen simultaneously |
| **Thumbnail images** | ≤ 40 KB each | Grid layouts with 6+ images |
| **Avatar images** | ≤ 15 KB each | Small, cached across sections |
| **Time to first image** | < 200ms (hero) | Preload + CDN cache |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Always set explicit `width`/`height` or `aspect-ratio` |

### Size Reduction Projections

| Image Category | Raw Total | After Optimization | Reduction |
|----------------|-----------|-------------------|-----------|
| Hero backgrounds (2 images) | ~4.7 MB | ~180 KB | 96% |
| Card images (5 images) | ~14.3 MB | ~400 KB | 97% |
| Blog thumbnails (7 images) | ~10.2 MB | ~245 KB | 98% |
| Avatars (3 images) | ~7.3 MB | ~45 KB | 99% |
| News cards (3 images) | ~4.4 MB | ~130 KB | 97% |
| Screenshots (7 files) | ~2.5 MB (est) | ~700 KB | 72% |
| **TOTAL** | **~43.4 MB** | **~1.7 MB** | **96%** |

---

## 8. File Organization & Naming Convention

### Proposed Directory Structure

```
public/
├── images/
│   ├── clinicalvision-logo.svg          # (existing)
│   ├── clinicalvision-icon.svg          # (existing)
│   │
│   ├── hero/
│   │   ├── landing-hero-data-eye.webp         # luke-jones-ac6UGoeSUSE
│   │   ├── landing-hero-data-eye-640w.webp    # responsive variant
│   │   ├── landing-hero-data-eye-960w.webp
│   │   └── landing-hero-data-eye-1920w.webp
│   │
│   ├── sections/
│   │   ├── technology-plexus-network.webp      # conny-schneider-xuTJZ7uD7PI
│   │   ├── technology-ai-chip.webp             # igor-omilaev-IsYT5rUuVcs
│   │   └── technology-plexus-banner.webp       # conny-schneider-pREq0ns_p_E
│   │
│   ├── cards/
│   │   ├── partner-scientist-microscope.webp   # national-cancer-institute-JxoWb7wHqnA
│   │   ├── partner-pathologist-profile.webp    # national-cancer-institute-ct10qdGv1hQ
│   │   ├── investor-doctor-chart.webp          # vitaly-gariev-8WYkI3cEZm8 (or AI chip)
│   │   ├── news-blood-tubes.webp               # testalize-me-0jE8ynV4mis
│   │   ├── news-cancer-cells.webp              # national-cancer-institute-L7en7Lb-Ovc
│   │   └── news-lab-pipetting.webp             # cdc-IFpQtennlj8
│   │
│   ├── avatars/
│   │   ├── testimonial-radiologist.webp        # Cropped from NCI microscope
│   │   ├── testimonial-clinician.webp          # Cropped from vitaly doctor
│   │   └── testimonial-researcher.webp         # Cropped from amari scientist
│   │
│   ├── blog/
│   │   ├── featured-ai-mammography.webp        # Main featured post image
│   │   ├── thumb-birads-categories.webp        # Screenshot S2 or stock
│   │   ├── thumb-sensitivity-study.webp        # NCI cancer cells
│   │   ├── thumb-ai-workflow.webp              # AI chip
│   │   ├── thumb-uncertainty.webp              # Screenshot S1
│   │   ├── thumb-patient-perspectives.webp     # Doctor + chart
│   │   └── thumb-rsna-conference.webp          # Molecular structures
│   │
│   └── screenshots/
│       ├── full-analysis-interface.webp         # S6
│       ├── full-analysis-interface-2x.webp      # S6 @ 2x
│       ├── malignancy-risk-panel.png            # S1 (PNG for sharp text)
│       ├── birads-assessment-panel.png          # S2
│       ├── finding-detail-1.png                 # S3
│       ├── finding-detail-2.png                 # S4
│       ├── clinical-recommendations.png         # S5
│       └── measurement-grid-view.webp           # S7
```

### Naming Convention Rules

1. **Lowercase, hyphen-separated**: `partner-scientist-microscope.webp`
2. **Descriptive, not source-based**: Use `scientist-microscope`, NOT `national-cancer-institute-JxoWb7wHqnA`
3. **Context prefix**: `hero-`, `card-`, `thumb-`, `avatar-`, `section-`, `screenshot-`
4. **Responsive suffix**: `-640w`, `-960w`, `-1280w`, `-1920w`
5. **Retina suffix**: `-2x` for explicit 2x variants

---

## 9. Implementation Priority Matrix

### Phase 1 — Critical (Week 1)

| Task | Impact | Effort | Files Modified |
|------|--------|--------|----------------|
| Self-host partner card images (replace external URLs) | 🔴 Eliminates CDN dependency | Low | `LandingPage.tsx` |
| Optimize & place hero background image | 🔴 First impression | Medium | `LandingPage.tsx` |
| Replace product visual placeholder with screenshot S6 | 🔴 Shows real product | Medium | `LandingPage.tsx` |
| Process & save all screenshots to `public/images/screenshots/` | 🔴 Enables showcase | Low | File system only |

### Phase 2 — High Impact (Week 2)

| Task | Impact | Effort | Files Modified |
|------|--------|--------|----------------|
| Replace 3 testimonial avatar placeholders | 🟠 Social proof credibility | Medium | `LandingPage.tsx` |
| Replace 3 news card placeholders | 🟠 Content richness | Medium | `LandingPage.tsx` |
| Replace investor section placeholder | 🟡 Section quality | Low | `LandingPage.tsx` |
| Add "From Black Box to Glass Box" background image | 🟡 Section depth | Low | `LandingPage.tsx` |

### Phase 3 — Content Enrichment (Week 3)

| Task | Impact | Effort | Files Modified |
|------|--------|--------|----------------|
| Add all 7 BlogPage images | 🟡 Blog page polish | Medium | `BlogPage.tsx` |
| Build product showcase section/page using screenshots | 🟠 Sales conversion | High | New page or `FeaturesPage.tsx` |
| Add secondary page hero backgrounds | 🟢 Page completeness | Low | Multiple pages |

### Phase 4 — Performance Polish (Week 4)

| Task | Impact | Effort | Files Modified |
|------|--------|--------|----------------|
| Generate responsive `srcset` variants for all images | 🟡 Mobile perf | Medium | All image references |
| Add `<picture>` elements with WebP/JPEG fallbacks | 🟡 Browser compat | Medium | All image references |
| Implement image preloading for hero images | 🟡 LCP optimization | Low | `index.html` |
| Add CLS prevention (`aspect-ratio`, explicit dimensions) | 🟡 Core Web Vitals | Low | All image containers |

---

## 10. Accessibility & Attribution

### Alt Text Guidelines

Every image MUST have descriptive alt text following these patterns:

| Image Type | Alt Text Pattern | Example |
|-----------|-----------------|---------|
| Hero backgrounds | Empty alt (decorative) or scene description | `alt=""` or `alt="Abstract data visualization forming an eye pattern"` |
| Product screenshots | Feature description | `alt="ClinicalVision analysis interface showing mammogram with GradCAM++ heatmap overlay, malignancy risk assessment, and BI-RADS scoring"` |
| Card images | Scene description | `alt="Scientist examining cell cultures through an inverted microscope in a research laboratory"` |
| Avatars | Person description | `alt="Portrait of a medical professional"` (NOT: `alt="Dr. Sarah Chen"` — stock photos should not impersonate named individuals) |
| Blog thumbnails | Article topic visual | `alt="Fluorescence microscopy image of colorectal cancer cells stained with markers"` |

### Unsplash Attribution

Per [Unsplash License](https://unsplash.com/license), attribution is **not required** but appreciated. If desired, credits can be placed in a subtle footer or credits page:

```
Photo credits:
- National Cancer Institute (NCI) via Unsplash
- Akram Huseyn via Unsplash
- CDC via Unsplash
- Igor Omilaev via Unsplash
- Luke Jones via Unsplash
- Conny Schneider via Unsplash
- Vitaly Gariev via Unsplash
- Testalize.me via Unsplash
- Amari Shutters via Unsplash
- Nathan Rimoux via Unsplash
- D koi via Unsplash
```

### WCAG Compliance Checklist

- [ ] All `<img>` elements have `alt` attributes
- [ ] Decorative images use `alt=""` and `role="presentation"`
- [ ] Text over images maintains 4.5:1 contrast ratio (check overlays)
- [ ] Images don't convey information not available in text
- [ ] Screenshots of UI elements have equivalent text descriptions nearby
- [ ] Color-coded elements in screenshots are explained in surrounding text

---

## Appendix: Quick Reference — Image to Slot Mapping

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ HERO BACKGROUND ─────────────────────────────────────────┐      │
│  │  luke-jones-ac6UGoeSUSE (data eye)  → 1920×1080 WebP     │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ┌─ PRODUCT VISUAL ──┐  ┌─ "BLACK BOX → GLASS BOX" ────────┐      │
│  │  Screenshot S6     │  │  conny-schneider-xuTJZ7uD7PI      │      │
│  │  Full interface    │  │  (plexus network bg)               │      │
│  │  700×960 WebP      │  │  1920×1080 WebP                    │      │
│  └───────────────────┘  └────────────────────────────────────┘      │
│                                                                      │
│  ┌─ PARTNER CARDS ───────────────────────────────────────────┐      │
│  │  Card 1: NCI-JxoWb7wHqnA (scientist) → 1200×780 WebP    │      │
│  │  Card 2: NCI-ct10qdGv1hQ (pathologist) → 1200×780 WebP   │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ┌─ TESTIMONIALS ────────────────────────────────────────────┐      │
│  │  Avatar 1: NCI-BQGxNnyuFtU (cropped)  → 184×184 WebP     │      │
│  │  Avatar 2: vitaly-gariev (cropped)     → 184×184 WebP     │      │
│  │  Avatar 3: amari-shutters (cropped)    → 184×184 WebP     │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ┌─ INVESTOR ─────────┐  ┌─ NEWS CARDS ─────────────────────┐      │
│  │  igor-omilaev       │  │  #1: testalize (blood tubes)     │      │
│  │  (AI chip)          │  │  #2: NCI-L7en7Lb (cancer cells)  │      │
│  │  1100×825 WebP      │  │  #3: cdc (lab pipetting)         │      │
│  └────────────────────┘  │  Each: 800×480 WebP               │      │
│                           └──────────────────────────────────┘      │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                         BLOG PAGE                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Featured: NCI-JxoWb7wHqnA or Screenshot S6 → 600×400 WebP         │
│  Post thumbnails: Mix of stock + screenshots → 420×280 WebP each    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                    PRODUCT SHOWCASE (NEW)                             │
├─────────────────────────────────────────────────────────────────────┤
│  Hero: Screenshot S6 (full interface)  → 2880×1620 WebP             │
│  Panels: S1, S2, S3, S4, S5           → 600×800 PNG each           │
│  Measurement: S7                       → 2732×1536 WebP             │
└─────────────────────────────────────────────────────────────────────┘
```

---

*This document serves as the single source of truth for all image-related decisions in the ClinicalVision frontend. Update this document when images are added, replaced, or optimized.*
