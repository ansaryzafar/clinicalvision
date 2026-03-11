# AI Metrics Dashboard Blueprint

## Enterprise-Grade AI Inference Performance & Confidence Visualization

> **Document Version**: 1.0  
> **Date**: 11 March 2026  
> **Scope**: Research findings, architecture design, component specifications, and wiring plan for a comprehensive AI analytics dashboard within ClinicalVision.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Industry Research & Standards](#2-industry-research--standards)
3. [Current State Audit](#3-current-state-audit)
4. [Proposed Dashboard Architecture](#4-proposed-dashboard-architecture)
5. [Metric Definitions & Value Proposition](#5-metric-definitions--value-proposition)
6. [Visual Component Specifications](#6-visual-component-specifications)
7. [Data Pipeline & Wiring Plan](#7-data-pipeline--wiring-plan)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Executive Summary

ClinicalVision currently collects **extensive AI inference data** — confidence scores, uncertainty quantification (MC Dropout), processing times, tile-level analysis, attention maps, and model versioning — but **none of this is visualized in aggregate**. The existing dashboards show only basic count statistics (total cases, in-progress, completed) using plain MUI cards.

Meanwhile, `recharts@3.6.0` is installed in `package.json` but has **zero imports** across the entire codebase. This document provides a complete blueprint for building an enterprise-grade AI analytics dashboard inspired by the dark-themed data visualization paradigms shown in the reference examples, adapted to the LUNIT design system.

### What This Dashboard Will Enable

| Stakeholder | Value |
|---|---|
| **Radiologists** | Confidence trend visibility, uncertainty alerts, trust calibration |
| **Department Heads** | Throughput analytics, workload distribution, performance KPIs |
| **QA / Compliance** | Model drift detection, BI-RADS distribution monitoring, audit trails |
| **Engineering / MLOps** | Inference latency tracking, model version comparison, error rates |

---

## 2. Industry Research & Standards

### 2.1 Industry Frameworks for ML Model Monitoring

The following frameworks define what metrics are considered industry-standard for production ML monitoring:

#### Google Vertex AI Model Monitoring
- **Feature drift detection** — Jensen-Shannon Divergence for numerical features, L-infinity distance for categorical features
- **Prediction drift** — monitors output distribution changes vs. training baseline
- **Feature attribution** — SHAP value tracking over time to detect when key features change importance
- **Alerting thresholds** — configurable per-feature with default 0.3 distance score

#### FDA SaMD (Software as a Medical Device) Requirements
- As of March 2026, **1,079+ AI-enabled medical devices** are FDA-authorized
- FDA requires **post-market performance monitoring** for SaMD
- Key requirements: sensitivity/specificity tracking, bias monitoring across demographic groups, clinical outcome correlation
- **21 CFR Part 11** mandates audit trails for all AI-assisted decisions

#### ACR (American College of Radiology) Best Practices
- **BI-RADS distribution monitoring** — unexpected shifts in category distribution indicate model behavior changes
- **Concordance tracking** — AI assessment vs. radiologist final assessment agreement rates
- **Callback rate monitoring** — percentage of cases flagged for additional workup
- **Reading time correlation** — AI-assisted vs. unassisted reading efficiency

#### MLOps Industry Standards (Evidently AI, Arize, Fiddler, WhyLabs)
Common dashboard patterns across production ML monitoring platforms:

| Metric Category | Standard Visualizations |
|---|---|
| **Model Performance** | Time-series line charts (accuracy, precision, recall over time) |
| **Prediction Distribution** | Stacked area charts, histogram overlays (benign vs. malignant ratios) |
| **Confidence Calibration** | Calibration curves (predicted probability vs. actual outcome frequency) |
| **Data Drift** | Distribution comparison plots, drift score time-series |
| **Latency** | Percentile line charts (p50, p90, p99), histogram distributions |
| **Uncertainty** | Scatter plots (confidence vs. uncertainty), threshold-based alerting |
| **Feature Attribution** | Horizontal bar charts (SHAP/attention importance ranking) |

### 2.2 Reference Dashboard Visual Paradigms

The two reference images demonstrate key visual patterns for data-dense dashboards:

**Reference 1 — Dark Tech Dashboard (∞ Tech)**
- **Dual progress bars** with labeled samples — ideal for benign/malignant comparison
- **Multi-line wave chart** — continuous data evolution over time (confidence trends)
- **Paired donut charts** — side-by-side percentage comparisons with large center values
- **Vertical bar clusters** — grouped metric comparison across categories
- Color scheme: dark navy background (#0A0E27), cyan accent (#00C9EA), teal gradients

**Reference 2 — Analytics Grid Dashboard**
- **Donut gauges** with percentage centers (75%, 50%) — ideal for confidence/accuracy KPIs
- **Area chart** with gradient fill — smooth trend visualization
- **Sparkline mini-charts** — compact trend indicators for secondary metrics
- **Combo bar+line chart** — dual-axis visualization (volume + trend overlay)
- **Segmented donut** — multi-category distribution breakdown
- Layout: 2×3 card grid, each card self-contained with title + visualization

### 2.3 Key Takeaways for ClinicalVision

1. **Dark theme dashboards** are the standard for analytics/monitoring — LUNIT's `#1A1A2E` maps well
2. **Gauges/donuts** for single KPI values, **line/area charts** for temporal trends, **bar charts** for distributions
3. **Every chart needs a clear title, current value callout, and trend indicator** (↑↓)
4. **Grid layout** (2-3 columns) with self-contained metric cards is the universal pattern
5. **Color coding**: green = good/low-risk, cyan = neutral/informational, amber = warning, red = critical

---

## 3. Current State Audit

### 3.1 Data We Collect But DON'T Visualize

This is the most critical finding — there is a massive gap between data collection and visualization:

| Data Source | Fields Available | Currently Visualized? |
|---|---|---|
| **Per-inference uncertainty** | `aleatoricUncertainty`, `predictiveEntropy`, `mutualInformation`, `mcSamples`, `mcStd` | ❌ Only `epistemicUncertainty` shown |
| **Inference timing** | `processingTimeMs` (per-image), `totalProcessingTimeMs` (batch) | ❌ Shown only as raw number in AnalysisResults |
| **Tile analysis metrics** | `global_probability`, `tile_weighted_average`, `tile_max_probability`, per-tile confidence/uncertainty | ❌ Not visualized at all |
| **Batch warnings** | `warnings[]` from batch analysis | ❌ Captured but never displayed |
| **Backend InferenceStatistics** | `total_inferences`, `prediction_distribution`, `risk_level_distribution`, `average_confidence`, `average_uncertainty`, `average_inference_time_ms`, `high_uncertainty_count` | ❌ API endpoint exists, no frontend consumer |
| **Inference History** | Per-image prediction history (confidence, prediction, uncertainty, timing over time) | ❌ API method `getInferenceHistory()` exists, no UI |
| **Backend ReportStatistics** | `total_reports`, `by_status`, `by_birads`, `critical_findings`, `ai_assisted_count`, `average_reading_time`, `average_complexity` | ❌ Schema exists, no API endpoint |
| **Backend ModelStatistics** | `total_models`, `active_models`, `fda_cleared_models`, `avg_auc_roc`, `latest_version` | ❌ Schema exists, no API endpoint |
| **Backend StorageStatistics** | `total_images`, `total_size_bytes`, `active_count`, `archived_count` | ❌ Schema exists, no API endpoint |
| **Prometheus metrics** | HTTP latency histograms, model inference latency, DB query latency, active users gauge, error counts | ❌ Only available at `/metrics` for Prometheus scraping |
| **Model performance logs** | Daily accuracy, sensitivity, specificity, PPV, NPV, AUC ROC, total predictions | ❌ DB model exists, no API |
| **Feedback/agreement** | AI vs. radiologist concordance, radiologist agreement tracking | ❌ Backend model exists, no frontend integration |
| **Workflow step timing** | `startedAt`/`completedAt` per workflow step | ❌ Never aggregated or visualized |
| **Confidence explanation text** | `confidenceExplanation` from model | ❌ Available but not displayed |

### 3.2 Charting Library Status

| Library | Version | Status |
|---|---|---|
| **recharts** | `^3.6.0` | ✅ Installed, ❌ Zero imports — completely unused |

**No additional charting libraries needed.** recharts provides: `AreaChart`, `LineChart`, `BarChart`, `PieChart`, `RadialBarChart`, `RadarChart`, `ComposedChart`, `Treemap`, `Tooltip`, `ResponsiveContainer`, and extensive customization.

### 3.3 Existing Dashboard Pages

| Page | Current Content | Gap |
|---|---|---|
| **ClinicalDashboard** (`/dashboard`) | 4 stat cards (Total/InProgress/Completed/HighPriority), recent cases list, system health status | No charts, no trends, no AI performance data |
| **FairnessDashboard** | Compliance score, regulatory status, per-subgroup sensitivity/specificity/AUC | Already well-built — keep as separate concern |
| **CasesDashboard** (`/cases`) | Active case worklist with count cards | Operational, not analytical |
| **AnalysisArchive** (`/analysis-archive`) | Saved analyses browser | Storage-focused, no aggregate analytics |

---

## 4. Proposed Dashboard Architecture

### 4.1 Dashboard Page Structure

We propose enhancing the existing `ClinicalDashboard` at `/dashboard` with a tabbed layout:

```
┌────────────────────────────────────────────────────────────────┐
│  AI Analytics Dashboard                                        │
│  ┌──────────────┐ ┌───────────────┐ ┌──────────────────────┐  │
│  │  Overview     │ │  Performance  │ │  Model Intelligence  │  │
│  └──────────────┘ └───────────────┘ └──────────────────────┘  │
│                                                                │
│  [Tab content rendered below]                                  │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 Tab 1: Overview (Default)

**Purpose**: At-a-glance operational and AI health summary

```
┌─────────────────────────────────────────────────────────────────┐
│  ROW 1: KPI Gauges (4 columns)                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │  Radial   │ │  Radial   │ │  Radial   │ │  Radial   │           │
│ │  Gauge    │ │  Gauge    │ │  Gauge    │ │  Gauge    │           │
│ │           │ │           │ │           │ │           │           │
│ │  Avg AI   │ │  Model    │ │  Cases    │ │  Avg      │           │
│ │Confidence │ │ Accuracy  │ │ Today     │ │ Latency   │           │
│ │   87%     │ │   94.2%   │ │   42      │ │  320ms    │           │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  ROW 2: Primary Charts (2 columns)                              │
│ ┌───────────────────────────┐ ┌───────────────────────────┐    │
│ │  Confidence Trend          │ │  Prediction Distribution   │    │
│ │  (AreaChart, 30-day)       │ │  (PieChart / DonutChart)   │    │
│ │                            │ │                            │    │
│ │  ~~~~/\~~~~~/\~~~          │ │      ┌──────┐              │    │
│ │  avg confidence over time  │ │      │ 62%  │ Benign       │    │
│ │  with uncertainty band     │ │      │      │ 38% Malig.   │    │
│ │                            │ │      └──────┘              │    │
│ └───────────────────────────┘ └───────────────────────────┘    │
│                                                                 │
│  ROW 3: Secondary Charts (3 columns)                            │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│ │ BI-RADS Distrib │ │ Risk Level     │ │ Inference Time │       │
│ │ (BarChart)      │ │ (BarChart)     │ │ (LineChart)    │       │
│ │ ┃  ┃            │ │ ┃  ┃ ┃  ┃     │ │ ─────/\──     │       │
│ │ 1  2  3  4  5   │ │ Low Med High   │ │ p50/p90/p99   │       │
│ └────────────────┘ └────────────────┘ └────────────────┘       │
│                                                                 │
│  ROW 4: System Health (full width)                              │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Model: BreastDCE-DL v2.1  │ Status: Online  │ GPU: OK │      │
│ │ Uptime: 99.7%  │  Errors (24h): 2  │  Queue: 0       │      │
│ └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Tab 2: Performance Deep Dive

**Purpose**: Detailed model performance analytics for QA and MLOps

```
┌─────────────────────────────────────────────────────────────────┐
│  ROW 1: Performance KPIs (4 columns)                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │Sensitivity│ │Specificity│ │  AUC-ROC  │ │   PPV     │           │
│ │  96.1%    │ │  92.3%    │ │   0.978   │ │   88.7%   │           │
│ │  ↑ 0.3%   │ │  ↓ 0.1%   │ │  ↑ 0.01   │ │  → 0.0%   │           │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  ROW 2: Confidence Analysis (2 columns)                         │
│ ┌───────────────────────────┐ ┌───────────────────────────┐    │
│ │  Confidence Distribution   │ │ Uncertainty vs Confidence  │    │
│ │  (Histogram)               │ │ (ScatterChart)             │    │
│ │                            │ │                            │    │
│ │  How confidence scores     │ │  Each dot = one analysis   │    │
│ │  distribute across all     │ │  X: confidence, Y: uncert. │    │
│ │  analyses (should be       │ │  Color: risk level         │    │
│ │  bimodal for good model)   │ │  Size: processing time     │    │
│ └───────────────────────────┘ └───────────────────────────┘    │
│                                                                 │
│  ROW 3: Temporal Analysis (full width)                          │
│ ┌───────────────────────────────────────────────────────┐      │
│ │  Confidence & Uncertainty Over Time (ComposedChart)    │      │
│ │                                                        │      │
│ │  AreaChart: confidence band (mean ± mcStd)             │      │
│ │  LineChart: epistemic uncertainty overlay               │      │
│ │  ScatterChart: high-uncertainty flagged cases          │      │
│ │  X-axis: time, Y-axis: score (0-1)                    │      │
│ │  Brush: zoomable time range selector                   │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│  ROW 4: Concordance & Calibration (2 columns)                   │
│ ┌───────────────────────────┐ ┌───────────────────────────┐    │
│ │  AI vs Radiologist         │ │  Calibration Curve         │    │
│ │  Agreement Rate            │ │  (LineChart)               │    │
│ │  (BarChart, grouped)       │ │                            │    │
│ │                            │ │  Predicted probability     │    │
│ │  Per BI-RADS category:     │ │  vs observed frequency     │    │
│ │  AI suggested vs final     │ │  (ideal = 45° line)        │    │
│ └───────────────────────────┘ └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Tab 3: Model Intelligence

**Purpose**: Deep model behavior insights for research and optimization

```
┌─────────────────────────────────────────────────────────────────┐
│  ROW 1: Uncertainty Decomposition (2 columns)                   │
│ ┌───────────────────────────┐ ┌───────────────────────────┐    │
│ │  Epistemic vs Aleatoric    │ │  Predictive Entropy        │    │
│ │  Uncertainty (AreaChart)   │ │  Distribution (Histogram)  │    │
│ │                            │ │                            │    │
│ │  Stacked area showing      │ │  How model certainty       │    │
│ │  model vs data uncertainty │ │  distributes — low entropy │    │
│ │  decomposition over time   │ │  = decisive, high = unsure │    │
│ └───────────────────────────┘ └───────────────────────────┘    │
│                                                                 │
│  ROW 2: Tile Analysis (2 columns)                               │
│ ┌───────────────────────────┐ ┌───────────────────────────┐    │
│ │  Tile Confidence Heatmap   │ │ Global vs Tile Weighted    │    │
│ │  (custom grid/Treemap)     │ │ Probability (ScatterChart) │    │
│ │                            │ │                            │    │
│ │  Spatial confidence map    │ │  Correlation between       │    │
│ │  showing which image       │ │  tile-level and global     │    │
│ │  regions drive predictions │ │  predictions               │    │
│ └───────────────────────────┘ └───────────────────────────┘    │
│                                                                 │
│  ROW 3: Model Version Comparison (full width)                   │
│ ┌───────────────────────────────────────────────────────┐      │
│ │  Performance by Model Version (GroupedBarChart)         │      │
│ │                                                        │      │
│ │  Compare accuracy, confidence, latency across versions │      │
│ │  Identify regressions when new models are deployed     │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│  ROW 4: Human Review Triggers (2 columns)                       │
│ ┌───────────────────────────┐ ┌───────────────────────────┐    │
│ │  Human Review Rate         │ │  Review Triggers by Type   │    │
│ │  Over Time (LineChart)     │ │  (PieChart)                │    │
│ │                            │ │                            │    │
│ │  % of cases flagged for    │ │  Why cases get flagged:    │    │
│ │  human review due to       │ │  high uncertainty,         │    │
│ │  model uncertainty         │ │  borderline confidence,    │    │
│ │                            │ │  conflicting views         │    │
│ └───────────────────────────┘ └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Metric Definitions & Value Proposition

### 5.1 Tier 1 — Critical KPIs (Always Visible)

These metrics should be prominently displayed as radial gauges or large number cards:

| Metric | Source | Calculation | Why It Matters |
|---|---|---|---|
| **Average AI Confidence** | `AnalysisResult.confidence` | Mean across all analyses in time window | Core trust indicator — tells users how certain the AI generally is |
| **Model Accuracy** | `ModelPerformanceLog` (backend) | `(TP + TN) / total` from confirmed outcomes | Gold standard performance metric — requires ground truth feedback loop |
| **Inference Latency (p50)** | `AnalysisResult.processingTimeMs` | Median processing time | Operational health — ensures real-time clinical workflow |
| **High Uncertainty Rate** | `UncertaintyInfo.requiresHumanReview` | `count(requiresHumanReview=true) / total` | Safety metric — high rates may indicate model degradation or data shift |

### 5.2 Tier 2 — Trend Charts (Time-Series)

| Metric | Chart Type | Source Fields | Value to Users |
|---|---|---|---|
| **Confidence Trend** | Area chart with gradient fill | `confidence` per analysis, grouped by day/week | Spot gradual model degradation before it becomes critical |
| **Prediction Distribution Over Time** | Stacked area chart | `prediction` counts (benign/malignant) by period | Detect dataset drift — sudden shift in malignant ratio flags data quality issues |
| **Inference Latency Percentiles** | Multi-line chart (p50, p90, p99) | `processingTimeMs` | Identify infrastructure bottlenecks, SLA compliance |
| **Uncertainty Trend** | Dual-line chart | `epistemicUncertainty`, `aleatoricUncertainty` averaged per period | Distinguish between model uncertainty (needs retraining) and data uncertainty (needs better images) |
| **BI-RADS Distribution Over Time** | Stacked bar chart | `suggestedBiRads` from batch results, or `individualBiRads` from findings | Regulatory monitoring — unexpected shifts trigger quality review |
| **Human Review Rate** | Line chart with threshold marker | `requiresHumanReview` rate per period | Track model's ability to make autonomous decisions |

### 5.3 Tier 3 — Distribution & Comparison Charts

| Metric | Chart Type | Source Fields | Value to Users |
|---|---|---|---|
| **Confidence Histogram** | Vertical bar chart | `confidence` binned into 10 buckets (0-0.1, ..., 0.9-1.0) | Healthy model shows bimodal distribution (peaks near 0 and 1); flat = poor discrimination |
| **Risk Level Distribution** | Donut/pie chart | `riskLevel` counts (low/moderate/high) | Quick risk landscape overview for department management |
| **Uncertainty vs. Confidence Scatter** | Scatter plot | X: `confidence`, Y: `epistemicUncertainty`, Color: `riskLevel` | Identify "dangerously confident" predictions (high confidence + high uncertainty) |
| **Prediction Probabilities** | Paired horizontal bars | `probabilities.benign`, `probabilities.malignant` per case | Visual benign/malignant spectrum for recent analyses |
| **Processing Time Distribution** | Histogram | `processingTimeMs` binned | Identify outlier slow analyses — may indicate problematic image types |

### 5.4 Tier 4 — Advanced Model Intelligence

| Metric | Chart Type | Source Fields | Value to Users |
|---|---|---|---|
| **Calibration Curve** | Line chart vs. diagonal | Predicted confidence vs. actual outcome frequency (requires feedback loop) | Quantifies whether "90% confident" truly means 90% correct |
| **AI vs. Radiologist Concordance** | Grouped bar chart | AI `suggestedBiRads` vs. radiologist final `biradsCategory` | Measures AI-human alignment per BI-RADS category |
| **Epistemic vs. Aleatoric Decomposition** | Stacked area chart | `epistemicUncertainty`, `aleatoricUncertainty` | Actionable insight: high epistemic → retrain model; high aleatoric → improve data quality |
| **Tile Confidence Distribution** | Heatmap / Treemap | `tile_weighted_average`, per-tile confidence, `tile_max_probability` | Understand spatial confidence patterns across image regions |
| **Model Version Performance** | Grouped bar chart | Metrics grouped by `modelVersion` | Track performance across model deployments, catch regressions |
| **Mutual Information** | Time-series line | `mutualInformation` from uncertainty metrics | Advanced metric for MC Dropout quality — high MI = model disagrees with itself |

---

## 6. Visual Component Specifications

### 6.1 Design System Integration

All dashboard components must use the LUNIT design tokens:

```typescript
const DASHBOARD_THEME = {
  // Base palette (dark dashboard variant)
  background: '#0F1022',         // Deep navy (inspired by reference images)
  cardBackground: '#161832',     // Slightly lighter card surface
  cardBorder: 'rgba(0, 201, 234, 0.08)',  // Subtle teal border
  
  // LUNIT tokens
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", monospace',
  
  // Chart colors
  primary: '#00C9EA',            // LUNIT teal — primary data series
  secondary: '#8B5CF6',          // Purple — secondary data series
  success: '#22C55E',            // Green — positive/benign
  warning: '#F59E0B',            // Amber — moderate risk/warning
  danger: '#EF4444',             // Red — high risk/malignant
  neutral: '#6B7280',            // Gray — reference lines, axes
  
  // Gradient fills (for area charts)
  primaryGradient: ['rgba(0, 201, 234, 0.3)', 'rgba(0, 201, 234, 0.0)'],
  successGradient: ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.0)'],
  dangerGradient: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.0)'],
} as const;
```

### 6.2 Component Library — recharts Building Blocks

Each visualization maps to specific recharts components:

#### 6.2.1 Radial Gauge (KPI Display)

**Use for**: Average confidence, accuracy, latency — single headline numbers

```tsx
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface GaugeCardProps {
  label: string;
  value: number;          // 0-100 or raw value
  maxValue: number;       // Scale max
  unit: string;           // '%', 'ms', etc.
  trend?: number;         // Change from previous period
  color: string;          // Arc fill color
}

// Visual structure:
// ┌──────────────────────┐
// │     label             │  ← overline text
// │   ┌──────────┐       │
// │   │   270°    │       │  ← RadialBarChart, startAngle=225, endAngle=-45
// │   │   87%    │       │  ← centered value text
// │   └──────────┘       │
// │   ↑ 2.3%             │  ← trend indicator (green up / red down)
// └──────────────────────┘

function GaugeCard({ label, value, maxValue, unit, trend, color }: GaugeCardProps) {
  const data = [{ value, fill: color }];
  
  return (
    <Paper sx={{ p: 2, bgcolor: DASHBOARD_THEME.cardBackground, borderRadius: 2 }}>
      <Typography variant="overline">{label}</Typography>
      <ResponsiveContainer width="100%" height={160}>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="90%"
          data={data}
          startAngle={225}
          endAngle={-45}
        >
          <PolarAngleAxis type="number" domain={[0, maxValue]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Center value overlay positioned absolutely */}
      <Typography variant="h4" align="center">{value}{unit}</Typography>
      {trend !== undefined && (
        <Typography color={trend >= 0 ? 'success.main' : 'error.main'}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}{unit}
        </Typography>
      )}
    </Paper>
  );
}
```

#### 6.2.2 Confidence Trend Area Chart

**Use for**: Confidence over time, uncertainty bands

```tsx
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Brush 
} from 'recharts';

// Data shape:
interface ConfidenceTrendPoint {
  date: string;             // '2026-03-01'
  avgConfidence: number;    // Mean confidence for the day
  upperBand: number;        // mean + 1 std dev (from mcStd)
  lowerBand: number;        // mean - 1 std dev
  analysisCount: number;    // Volume for that day
}

// Visual structure:
// ┌──────────────────────────────────────────────────┐
// │  Confidence Trend (30 Days)           87.3% avg  │
// │                                                   │
// │  1.0 ─────────────────────────────────────────── │
// │      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← upper band (light fill)
// │  0.8 ═══════╗     ╔═══════════╗    ╔════════════ │  ← avg confidence (solid line)
// │      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← lower band (light fill)
// │  0.6 ─────────────────────────────────────────── │
// │                                                   │
// │       Mar 1    Mar 8    Mar 15    Mar 22          │
// │  [═══════════════ Brush (time range) ══════════] │
// └──────────────────────────────────────────────────┘

function ConfidenceTrendChart({ data }: { data: ConfidenceTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C9EA" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#00C9EA" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" stroke="#6B7280" fontSize={11} />
        <YAxis domain={[0, 1]} stroke="#6B7280" fontSize={11} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#161832', 
            border: '1px solid rgba(0,201,234,0.2)',
            borderRadius: 8 
          }} 
        />
        {/* Uncertainty band (upper) */}
        <Area 
          type="monotone" 
          dataKey="upperBand" 
          stroke="none" 
          fill="rgba(0,201,234,0.08)" 
        />
        {/* Uncertainty band (lower) */}
        <Area 
          type="monotone" 
          dataKey="lowerBand" 
          stroke="none" 
          fill="#0F1022" 
        />
        {/* Main confidence line */}
        <Area 
          type="monotone" 
          dataKey="avgConfidence" 
          stroke="#00C9EA" 
          strokeWidth={2}
          fill="url(#confidenceGradient)" 
        />
        <Brush dataKey="date" height={20} stroke="#00C9EA" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

#### 6.2.3 Prediction Distribution Donut

**Use for**: Benign/malignant ratio, BI-RADS distribution

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// Data shape:
interface PredictionDistribution {
  name: string;        // 'Benign' | 'Malignant'
  value: number;       // Count
  color: string;       // '#22C55E' | '#EF4444'
}

// Visual structure (donut with center label):
// ┌─────────────────────┐
// │  Prediction Split    │
// │                      │
// │      ╔═══════╗      │  ← outer ring: benign (green)
// │     ║  62%   ║      │  ← center: majority percentage
// │     ║ Benign ║      │
// │      ╚═══════╝      │  ← inner gap creates donut
// │                      │
// │  ● Benign  62%       │
// │  ● Malignant 38%     │
// └─────────────────────┘

function PredictionDonut({ data }: { data: PredictionDistribution[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        {/* Center text rendered as custom label */}
      </PieChart>
    </ResponsiveContainer>
  );
}
```

#### 6.2.4 BI-RADS Distribution Bar Chart

**Use for**: Category distribution, risk level breakdown

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Data shape:
interface BiRadsDistribution {
  category: string;    // 'BI-RADS 1', 'BI-RADS 2', ...
  count: number;       // Number of cases
  color: string;       // Color by risk level
}

// Visual structure:
// ┌──────────────────────────────────┐
// │  BI-RADS Distribution            │
// │                                   │
// │  50 ─                             │
// │  40 ─      ┃┃                     │
// │  30 ─  ┃┃  ┃┃                     │
// │  20 ─  ┃┃  ┃┃  ┃┃                │
// │  10 ─  ┃┃  ┃┃  ┃┃  ┃┃  ┃┃       │
// │       ─────────────────────       │
// │       BR1  BR2  BR3  BR4  BR5     │
// └──────────────────────────────────┘

const BIRADS_COLORS = {
  'BI-RADS 1': '#22C55E',   // Negative — green
  'BI-RADS 2': '#86EFAC',   // Benign — light green
  'BI-RADS 3': '#F59E0B',   // Probably benign — amber
  'BI-RADS 4': '#F97316',   // Suspicious — orange
  'BI-RADS 5': '#EF4444',   // Highly suspicious — red
};
```

#### 6.2.5 Inference Latency Percentile Chart

**Use for**: Processing time monitoring

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Data shape:
interface LatencyPoint {
  date: string;
  p50: number;       // Median latency (ms)
  p90: number;       // 90th percentile
  p99: number;       // 99th percentile
  slaThreshold: number;  // SLA target (e.g., 500ms)
}

// Visual structure:
// ┌──────────────────────────────────────────┐
// │  Inference Latency (ms)                   │
// │                                           │
// │  800 ─                                    │
// │       ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ SLA 500ms │  ← dashed reference line
// │  400 ─ ────p99──────────────              │  ← red line
// │  300 ─ ────p90──────────                  │  ← amber line
// │  200 ─ ────p50──────                      │  ← teal line (primary)
// │       ─────────────────────               │
// │       Mar 1    Mar 8    Mar 15            │
// └──────────────────────────────────────────┘

// Three lines: p50 (teal), p90 (amber), p99 (red)
// Plus a dashed ReferenceLine for SLA threshold
```

#### 6.2.6 Uncertainty vs. Confidence Scatter Plot

**Use for**: Identifying "dangerously confident" predictions

```tsx
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Data shape:
interface UncertaintyScatterPoint {
  confidence: number;        // X-axis (0-1)
  uncertainty: number;       // Y-axis (epistemic, 0+)
  riskLevel: 'low' | 'moderate' | 'high';  // Color encoding
  processingTimeMs: number;  // Size encoding (optional)
  caseId: string;            // For tooltip
}

// Visual structure:
// ┌──────────────────────────────────────────┐
// │  Uncertainty vs. Confidence               │
// │                                           │
// │  High │  ●(danger        ●(warning        │
// │ Uncert│   zone)           zone)            │
// │       │                                    │
// │  Low  │              ●●●●●●●(ideal zone)  │
// │       └────────────────────────────────    │
// │        Low Confidence    High Confidence   │
// │                                           │
// │  ● Low risk  ● Moderate  ● High risk      │
// └──────────────────────────────────────────┘

// QUADRANT INTERPRETATION:
// Top-left:     HIGH uncertainty + LOW confidence  → Model says "I don't know" (GOOD — honest)
// Top-right:    HIGH uncertainty + HIGH confidence  → DANGER ZONE (overconfident despite uncertainty)
// Bottom-left:  LOW uncertainty + LOW confidence    → Model confidently predicts benign (verify)
// Bottom-right: LOW uncertainty + HIGH confidence   → IDEAL (confident and certain)
```

### 6.3 Chart Card Wrapper Component

Every chart should be wrapped in a consistent card component:

```tsx
interface MetricCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;     // Optional headline value
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  timeRange?: string;          // e.g., 'Last 30 days'
  children: React.ReactNode;   // The chart component
  height?: number;
}

// Visual structure:
// ┌────────────────────────────────────────┐
// │  Title                    87.3%  ↑2.1% │  ← header row
// │  Subtitle (optional)      Last 30 days │  ← secondary row
// │ ──────────────────────────────────────  │  ← subtle divider
// │                                         │
// │          [Chart Content]                │  ← recharts component
// │                                         │
// └────────────────────────────────────────┘
```

### 6.4 Dashboard Layout Grid

Using MUI Grid for responsive layout:

```tsx
// Desktop (≥1200px): 4 columns for KPIs, 2 or 3 columns for charts
// Tablet (≥900px):  2 columns for KPIs, 1-2 columns for charts
// Mobile (≥600px):  1 column, stacked

<Grid container spacing={2.5}>
  {/* KPI Row — 4 gauges */}
  <Grid item xs={6} md={3}><GaugeCard ... /></Grid>
  <Grid item xs={6} md={3}><GaugeCard ... /></Grid>
  <Grid item xs={6} md={3}><GaugeCard ... /></Grid>
  <Grid item xs={6} md={3}><GaugeCard ... /></Grid>
  
  {/* Primary Charts — 2 columns */}
  <Grid item xs={12} md={6}><MetricCard title="Confidence Trend">...</MetricCard></Grid>
  <Grid item xs={12} md={6}><MetricCard title="Predictions">...</MetricCard></Grid>
  
  {/* Secondary Charts — 3 columns */}
  <Grid item xs={12} md={4}><MetricCard title="BI-RADS">...</MetricCard></Grid>
  <Grid item xs={12} md={4}><MetricCard title="Risk Levels">...</MetricCard></Grid>
  <Grid item xs={12} md={4}><MetricCard title="Latency">...</MetricCard></Grid>
</Grid>
```

---

## 7. Data Pipeline & Wiring Plan

### 7.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │ Dashboard     │ ←── │ useMetrics() │ ←── │ metricsApi  │ │
│  │ Components    │     │ Custom Hook  │     │ Service     │ │
│  │ (recharts)    │     │ (SWR/React   │     │             │ │
│  │               │     │  Query-like) │     │ REST calls  │ │
│  └──────────────┘     └──────────────┘     └──────┬──────┘ │
│                                                     │        │
├─────────────────────────────────────────────────────┼────────┤
│                                                     │        │
│                    BACKEND (FastAPI)                 │        │
│                                                     ▼        │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │ PostgreSQL    │ ←── │ Analytics    │ ←── │ /api/v1/    │ │
│  │ (analysis_    │     │ Service      │     │ analytics/  │ │
│  │  results,     │     │              │     │ endpoints   │ │
│  │  model_perf)  │     │ Aggregation  │     │             │ │
│  └──────────────┘     │ & Caching    │     └─────────────┘ │
│                        └──────────────┘                      │
│  ┌──────────────┐                                            │
│  │ Local Case   │ ← Also aggregate from caseStore (frontend │
│  │ Store        │   localStorage) for offline/demo metrics   │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Backend API Endpoints Needed

#### 7.2.1 New Endpoint: `GET /api/v1/analytics/overview`

**Purpose**: Primary data feed for the Overview tab

```python
# Request params:
#   ?period=7d|30d|90d|all (default: 30d)

# Response schema:
{
  "kpis": {
    "total_analyses": 1247,
    "average_confidence": 0.873,
    "average_inference_time_ms": 312.4,
    "high_uncertainty_rate": 0.067,     # 6.7% flagged for review
    "total_cases": 89,
    "completed_cases": 72
  },
  "kpi_trends": {
    "confidence_change": 0.023,         # vs previous period
    "latency_change": -15.2,
    "uncertainty_change": -0.008
  },
  "confidence_trend": [
    {
      "date": "2026-03-01",
      "avg_confidence": 0.87,
      "std_confidence": 0.12,           # For uncertainty band
      "analysis_count": 14
    },
    // ... one entry per day
  ],
  "prediction_distribution": {
    "benign": 774,
    "malignant": 473
  },
  "risk_distribution": {
    "low": 612,
    "moderate": 398,
    "high": 237
  },
  "birads_distribution": {
    "1": 145, "2": 312, "3": 198, "4": 156, "5": 36
  },
  "latency_percentiles": [
    {
      "date": "2026-03-01",
      "p50": 287,
      "p90": 445,
      "p99": 892
    },
    // ... per day
  ]
}
```

**Backend implementation**: Aggregate from `analysis_results` table, grouping by date. Use SQL window functions for percentile calculations. Cache with 5-minute TTL.

#### 7.2.2 New Endpoint: `GET /api/v1/analytics/performance`

**Purpose**: Data feed for the Performance tab

```python
# Request params:
#   ?period=7d|30d|90d|all
#   ?model_version=latest|all|<specific_version>

# Response schema:
{
  "performance_kpis": {
    "sensitivity": 0.961,               # From model_performance_logs
    "specificity": 0.923,
    "auc_roc": 0.978,
    "ppv": 0.887,
    "npv": 0.969
  },
  "confidence_distribution": [
    { "bin": "0.0-0.1", "count": 23 },
    { "bin": "0.1-0.2", "count": 15 },
    // ... 10 bins
    { "bin": "0.9-1.0", "count": 387 }
  ],
  "uncertainty_scatter": [
    {
      "confidence": 0.92,
      "epistemic_uncertainty": 0.03,
      "risk_level": "low",
      "processing_time_ms": 298,
      "case_id": "CV-2026-001234",
      "analyzed_at": "2026-03-10T14:30:00Z"
    },
    // ... one per analysis (paginated, max 500)
  ],
  "temporal_confidence": [
    {
      "date": "2026-03-01",
      "avg_confidence": 0.87,
      "avg_epistemic": 0.045,
      "avg_aleatoric": 0.023,
      "mc_std_mean": 0.078,
      "flagged_count": 2
    },
    // ... per day
  ],
  "concordance": {
    // Only populated if feedback data exists
    "overall_agreement_rate": 0.89,
    "by_birads": {
      "1": { "agreed": 45, "disagreed": 2 },
      "2": { "agreed": 120, "disagreed": 8 },
      "3": { "agreed": 67, "disagreed": 15 },
      "4": { "agreed": 48, "disagreed": 12 },
      "5": { "agreed": 14, "disagreed": 1 }
    }
  }
}
```

**Backend implementation**: Query `analysis_results` + `model_performance_logs` + `feedback` tables. For concordance, join AI predictions with radiologist final assessments.

#### 7.2.3 New Endpoint: `GET /api/v1/analytics/model-intelligence`

**Purpose**: Data feed for the Model Intelligence tab

```python
# Response schema:
{
  "uncertainty_decomposition": [
    {
      "date": "2026-03-01",
      "avg_epistemic": 0.045,
      "avg_aleatoric": 0.023,
      "avg_predictive_entropy": 0.12,
      "avg_mutual_information": 0.034
    },
    // ... per day
  ],
  "entropy_distribution": [
    { "bin": "0.0-0.05", "count": 456 },
    { "bin": "0.05-0.10", "count": 234 },
    // ... bins
  ],
  "tile_analysis_summary": {
    "avg_tile_count": 12,
    "global_vs_weighted_correlation": 0.94,
    "max_tile_probability_avg": 0.67,
    "scatter_data": [
      {
        "global_probability": 0.72,
        "tile_weighted_average": 0.68,
        "tile_max_probability": 0.91
      },
      // ... per analysis that used tile mode
    ]
  },
  "model_version_comparison": [
    {
      "version": "v2.0.1",
      "analysis_count": 340,
      "avg_confidence": 0.85,
      "avg_latency_ms": 350,
      "avg_uncertainty": 0.05,
      "high_uncertainty_rate": 0.08
    },
    {
      "version": "v2.1.0",
      "analysis_count": 907,
      "avg_confidence": 0.88,
      "avg_latency_ms": 312,
      "avg_uncertainty": 0.04,
      "high_uncertainty_rate": 0.06
    }
  ],
  "human_review_trend": [
    {
      "date": "2026-03-01",
      "total_analyses": 14,
      "flagged_for_review": 1,
      "review_rate": 0.071
    },
    // ... per day
  ],
  "review_triggers": {
    "high_uncertainty": 34,
    "borderline_confidence": 18,
    "conflicting_views": 7,
    "low_attention_score": 3
  }
}
```

#### 7.2.4 Existing Endpoint to Wire: `GET /api/v1/inference/statistics`

**Status**: Backend `InferenceStatistics` schema exists. The endpoint likely exists but has no frontend consumer.

```python
# Already defined in backend schemas:
InferenceStatistics:
  total_inferences: int
  prediction_distribution: Dict[str, int]
  risk_level_distribution: Dict[str, int]
  average_confidence: float
  average_epistemic_uncertainty: float
  average_inference_time_ms: float
  high_uncertainty_count: int
```

**Frontend wiring**: Create `metricsApi.getInferenceStatistics()` → calls this endpoint → feeds KPI gauges.

#### 7.2.5 Existing Endpoint to Wire: `GET /api/v1/inference/history/{image_id}`

**Status**: Frontend method `getInferenceHistory()` exists but is never called from any component.

**Frontend wiring**: Call from the Performance tab's temporal analysis charts.

### 7.3 Frontend Data Layer

#### 7.3.1 New API Service: `metricsApi.ts`

```typescript
// clinicalvision_frontend/src/services/metricsApi.ts

import { apiClient } from '../utils/apiClient';

export type MetricsPeriod = '7d' | '30d' | '90d' | 'all';

export interface OverviewMetrics {
  kpis: {
    total_analyses: number;
    average_confidence: number;
    average_inference_time_ms: number;
    high_uncertainty_rate: number;
    total_cases: number;
    completed_cases: number;
  };
  kpi_trends: {
    confidence_change: number;
    latency_change: number;
    uncertainty_change: number;
  };
  confidence_trend: Array<{
    date: string;
    avg_confidence: number;
    std_confidence: number;
    analysis_count: number;
  }>;
  prediction_distribution: Record<string, number>;
  risk_distribution: Record<string, number>;
  birads_distribution: Record<string, number>;
  latency_percentiles: Array<{
    date: string;
    p50: number;
    p90: number;
    p99: number;
  }>;
}

export interface PerformanceMetrics {
  performance_kpis: {
    sensitivity: number;
    specificity: number;
    auc_roc: number;
    ppv: number;
    npv: number;
  };
  confidence_distribution: Array<{ bin: string; count: number }>;
  uncertainty_scatter: Array<{
    confidence: number;
    epistemic_uncertainty: number;
    risk_level: string;
    processing_time_ms: number;
    case_id: string;
    analyzed_at: string;
  }>;
  temporal_confidence: Array<{
    date: string;
    avg_confidence: number;
    avg_epistemic: number;
    avg_aleatoric: number;
    mc_std_mean: number;
    flagged_count: number;
  }>;
  concordance: {
    overall_agreement_rate: number;
    by_birads: Record<string, { agreed: number; disagreed: number }>;
  };
}

export interface ModelIntelligenceMetrics {
  uncertainty_decomposition: Array<{
    date: string;
    avg_epistemic: number;
    avg_aleatoric: number;
    avg_predictive_entropy: number;
    avg_mutual_information: number;
  }>;
  entropy_distribution: Array<{ bin: string; count: number }>;
  tile_analysis_summary: {
    avg_tile_count: number;
    global_vs_weighted_correlation: number;
    scatter_data: Array<{
      global_probability: number;
      tile_weighted_average: number;
      tile_max_probability: number;
    }>;
  };
  model_version_comparison: Array<{
    version: string;
    analysis_count: number;
    avg_confidence: number;
    avg_latency_ms: number;
    avg_uncertainty: number;
    high_uncertainty_rate: number;
  }>;
  human_review_trend: Array<{
    date: string;
    total_analyses: number;
    flagged_for_review: number;
    review_rate: number;
  }>;
  review_triggers: Record<string, number>;
}

// === API Methods ===

export async function getOverviewMetrics(period: MetricsPeriod = '30d'): Promise<OverviewMetrics> {
  const response = await apiClient.get(`/api/v1/analytics/overview?period=${period}`);
  return response.data;
}

export async function getPerformanceMetrics(
  period: MetricsPeriod = '30d', 
  modelVersion?: string
): Promise<PerformanceMetrics> {
  const params = new URLSearchParams({ period });
  if (modelVersion) params.set('model_version', modelVersion);
  const response = await apiClient.get(`/api/v1/analytics/performance?${params}`);
  return response.data;
}

export async function getModelIntelligenceMetrics(): Promise<ModelIntelligenceMetrics> {
  const response = await apiClient.get('/api/v1/analytics/model-intelligence');
  return response.data;
}
```

#### 7.3.2 Custom Hook: `useMetrics.ts`

```typescript
// clinicalvision_frontend/src/hooks/useMetrics.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getOverviewMetrics, 
  getPerformanceMetrics, 
  getModelIntelligenceMetrics,
  MetricsPeriod,
  OverviewMetrics,
  PerformanceMetrics,
  ModelIntelligenceMetrics
} from '../services/metricsApi';

interface UseMetricsOptions {
  period?: MetricsPeriod;
  refreshIntervalMs?: number;    // Auto-refresh (default: 5 minutes)
  enabled?: boolean;             // Disable fetching when tab not active
}

interface UseMetricsReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

export function useOverviewMetrics(options?: UseMetricsOptions): UseMetricsReturn<OverviewMetrics> {
  // Implementation: fetch on mount, auto-refresh, cache, error handling
  // Uses AbortController for cleanup, setInterval for refresh
}

export function usePerformanceMetrics(options?: UseMetricsOptions): UseMetricsReturn<PerformanceMetrics> {
  // Similar pattern with model version filter support
}

export function useModelIntelligenceMetrics(options?: UseMetricsOptions): UseMetricsReturn<ModelIntelligenceMetrics> {
  // Similar pattern
}
```

#### 7.3.3 Offline/Demo Mode — Local Case Store Aggregation

When backend analytics endpoints are unavailable (demo mode, offline), aggregate from the frontend `caseStore`:

```typescript
// clinicalvision_frontend/src/services/localMetricsAggregator.ts

import { clinicalSessionService } from './clinicalSession.service';
import { OverviewMetrics } from './metricsApi';

/**
 * Aggregate metrics from the local case store (localStorage/sessionStorage)
 * for demo mode or when backend analytics endpoints are unavailable.
 * 
 * Iterates all sessions and their analysis results to compute:
 * - Average confidence across all analyses
 * - Prediction distribution (benign vs malignant counts)
 * - Risk level distribution
 * - Processing time statistics
 * - BI-RADS distribution from consolidatedFindings
 */
export function aggregateLocalMetrics(): OverviewMetrics {
  const sessions = clinicalSessionService.getAllSessions();
  
  // Walk each session's case → analysisResults → extract fields:
  // - case.analysisResults[].confidence
  // - case.analysisResults[].prediction
  // - case.analysisResults[].riskLevel
  // - case.analysisResults[].processingTimeMs
  // - case.analysisResults[].uncertainty?.epistemicUncertainty
  // - case.analysisResults[].uncertainty?.requiresHumanReview
  // - case.consolidatedFindings[].individualBiRads
  
  // Group by case.audit.createdAt date for trend data
  // Return same OverviewMetrics shape as the backend would
}
```

### 7.4 Wiring Each Chart to Real Data

This section maps every proposed chart to its exact data source field path:

#### Overview Tab

| Chart | Data Source | Field Path | Aggregation |
|---|---|---|---|
| **Avg Confidence Gauge** | Backend analytics or local aggregation | `analysisResults[].confidence` | Mean across period |
| **Accuracy Gauge** | Backend `model_performance_logs` table | `daily accuracy` | Latest entry |
| **Cases Today Gauge** | Backend cases API or local caseStore | Count of cases with `audit.createdAt` = today | Count |
| **Avg Latency Gauge** | Backend analytics or local aggregation | `analysisResults[].processingTimeMs` | Median |
| **Confidence Trend** | Backend analytics or local aggregation | `analysisResults[].confidence` grouped by `analyzedAt` date | Mean + StdDev per day |
| **Prediction Donut** | Backend analytics or local aggregation | `analysisResults[].prediction` | Count per class |
| **BI-RADS Bars** | Backend analytics or local aggregation | `consolidatedFindings[].individualBiRads` OR batch `suggestedBiRads` | Count per category |
| **Risk Bars** | Backend analytics or local aggregation | `analysisResults[].riskLevel` | Count per level |
| **Latency Lines** | Backend analytics or local aggregation | `analysisResults[].processingTimeMs` grouped by day | p50/p90/p99 |

#### Performance Tab

| Chart | Data Source | Field Path | Notes |
|---|---|---|---|
| **Sensitivity/Specificity/AUC/PPV Gauges** | Backend `model_performance_logs` | `sensitivity`, `specificity`, `auc_roc`, `positive_predictive_value` | Requires ground truth feedback loop |
| **Confidence Histogram** | Per-analysis confidence | `analysisResults[].confidence` | Bin into 10 buckets, count per bucket |
| **Uncertainty vs. Confidence Scatter** | Per-analysis data | X: `.confidence`, Y: `.uncertainty.epistemicUncertainty`, Color: `.riskLevel`, Size: `.processingTimeMs` | Direct mapping, max 500 points |
| **Confidence+Uncertainty Over Time** | Per-analysis data grouped by day | `.confidence`, `.uncertainty.epistemicUncertainty`, `.uncertainty.aleatoricUncertainty`, `.uncertainty.mcStd` | Mean per day |
| **AI vs. Radiologist Concordance** | Feedback/assessment data | AI `suggestedBiRads` vs. final `biradsCategory` from radiologist assessment | Requires saving both values |
| **Calibration Curve** | Confidence vs. actual outcome | `.confidence` binned vs. % that were actually malignant in each bin | Requires pathology-confirmed ground truth |

#### Model Intelligence Tab

| Chart | Data Source | Field Path | Notes |
|---|---|---|---|
| **Epistemic vs. Aleatoric Area** | Per-analysis uncertainty | `.uncertainty.epistemicUncertainty`, `.uncertainty.aleatoricUncertainty` grouped by day | Stacked area, mean per day |
| **Entropy Distribution** | Per-analysis uncertainty | `.uncertainty.predictiveEntropy` | Histogram binning |
| **Tile Confidence Heatmap** | Tile analysis results | `tile_analysis.tiles[].confidence`, `tiles[].tile_index` | Only for analyses run in tile mode |
| **Global vs. Tile Weighted Scatter** | Tile analysis results | `tile_analysis.global_probability` vs. `.tile_weighted_average` | One dot per tile-mode analysis |
| **Model Version Comparison** | Per-analysis metadata | `.modelVersion` — group all metrics by version | Grouped bar chart |
| **Human Review Rate** | Per-analysis uncertainty | `.uncertainty.requiresHumanReview` rate per day | Line chart |
| **Review Triggers Pie** | Per-analysis flags | Count cases by trigger reason (high uncertainty, borderline confidence, etc.) | Categorize from uncertainty thresholds |

### 7.5 Data Freshness & Caching Strategy

| Data Type | Update Frequency | Cache TTL | Refresh Trigger |
|---|---|---|---|
| KPIs (gauges) | Every 5 minutes | 5 min | Auto-refresh, manual refresh button |
| Trend charts (30-day) | Every 30 minutes | 30 min | Tab switch, period change |
| Distribution charts | Every 15 minutes | 15 min | New analysis completed |
| Scatter plots | On demand | 10 min | Tab switch |
| Local store aggregation | Immediate | No cache | Computed from caseStore on render |

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal**: Dashboard shell + local data aggregation

| Task | Effort | Details |
|---|---|---|
| Create `MetricCard` wrapper component | 2h | Consistent card styling with title, value, trend |
| Create `GaugeCard` component | 3h | RadialBarChart-based KPI display |
| Create `localMetricsAggregator.ts` | 4h | Aggregate from caseStore for demo mode |
| Enhance `ClinicalDashboard` with tabs | 3h | Overview / Performance / Model Intelligence tabs |
| Build Overview tab layout with Grid | 4h | 4 gauges + chart placeholders |
| Wire gauges to local aggregated data | 2h | Connect GaugeCard to localMetricsAggregator |

**Deliverable**: Dashboard with 4 working KPI gauges pulling from local case data.

### Phase 2: Core Charts (Week 3-4)

**Goal**: Primary visualization components

| Task | Effort | Details |
|---|---|---|
| `ConfidenceTrendChart` component | 4h | AreaChart with uncertainty band + Brush |
| `PredictionDonut` component | 2h | PieChart with center label |
| `BiRadsBarChart` component | 2h | BarChart with color-coded BI-RADS categories |
| `RiskDistributionChart` component | 2h | BarChart with risk level colors |
| `LatencyPercentilesChart` component | 3h | Multi-line chart (p50/p90/p99) |
| Wire all to local aggregated data | 3h | Connect to localMetricsAggregator |
| Add period selector (7d/30d/90d) | 2h | Dropdown that re-aggregates data |

**Deliverable**: Fully functional Overview tab with 5 charts + 4 gauges.

### Phase 3: Backend Analytics API (Week 5-6)

**Goal**: Real aggregated data from PostgreSQL

| Task | Effort | Details |
|---|---|---|
| Create `analytics_service.py` on backend | 8h | SQL aggregation queries with caching |
| Create `GET /api/v1/analytics/overview` | 4h | Overview metrics endpoint |
| Create `GET /api/v1/analytics/performance` | 4h | Performance metrics endpoint |
| Create `GET /api/v1/analytics/model-intelligence` | 4h | Model intelligence endpoint |
| Create `metricsApi.ts` frontend service | 3h | API client methods |
| Create `useMetrics.ts` hooks | 3h | Auto-refresh, loading/error states |
| Switch dashboard from local to API data | 2h | Feature flag: backend vs. local |

**Deliverable**: Dashboard pulling real aggregated data from backend with auto-refresh.

### Phase 4: Performance & Intelligence Tabs (Week 7-8)

**Goal**: Advanced visualization components

| Task | Effort | Details |
|---|---|---|
| `ConfidenceHistogram` component | 3h | BarChart with 10 bins |
| `UncertaintyScatter` component | 4h | ScatterChart with quadrant annotations |
| `TemporalConfidenceChart` component | 4h | ComposedChart (area + line + scatter) |
| `ConcordanceChart` component | 3h | Grouped BarChart |
| `UncertaintyDecompositionChart` component | 3h | Stacked AreaChart |
| `ModelVersionComparison` component | 3h | Grouped BarChart |
| `HumanReviewRateChart` component | 2h | LineChart with threshold |
| `ReviewTriggersPie` component | 2h | PieChart with legend |
| Wire Performance tab | 2h | Connect to usePerformanceMetrics |
| Wire Model Intelligence tab | 2h | Connect to useModelIntelligenceMetrics |

**Deliverable**: All 3 tabs fully functional with 15+ chart components.

### Phase 5: Polish & Testing (Week 9-10)

**Goal**: Production-ready dashboard

| Task | Effort | Details |
|---|---|---|
| Responsive design testing | 3h | Test on tablet/mobile breakpoints |
| Empty state handling | 2h | "No data yet" states for each chart |
| Loading skeletons | 2h | Shimmer placeholders while data loads |
| Error states | 2h | Graceful degradation per chart |
| Unit tests for aggregator | 4h | Test localMetricsAggregator calculations |
| Component tests for charts | 6h | Test each chart component renders correctly |
| Accessibility audit | 3h | aria-labels, keyboard navigation, screen reader |
| Performance profiling | 2h | Ensure no re-render storms with large datasets |
| Documentation update | 2h | Update workflow docs with dashboard features |

**Deliverable**: Production-ready, tested, accessible AI analytics dashboard.

---

## Appendix A: File Structure

```
clinicalvision_frontend/src/
├── components/
│   └── dashboard/
│       ├── ClinicalDashboard.tsx          # Enhanced with tabs
│       ├── charts/
│       │   ├── GaugeCard.tsx              # RadialBar KPI gauge
│       │   ├── MetricCard.tsx             # Chart wrapper card
│       │   ├── ConfidenceTrendChart.tsx    # Area chart with bands
│       │   ├── PredictionDonut.tsx         # Donut pie chart
│       │   ├── BiRadsBarChart.tsx          # BI-RADS distribution
│       │   ├── RiskDistributionChart.tsx   # Risk level bars
│       │   ├── LatencyPercentilesChart.tsx # p50/p90/p99 lines
│       │   ├── ConfidenceHistogram.tsx     # Confidence bin distribution
│       │   ├── UncertaintyScatter.tsx      # Confidence vs uncertainty
│       │   ├── TemporalConfidenceChart.tsx # Time-series composed
│       │   ├── ConcordanceChart.tsx        # AI vs radiologist
│       │   ├── UncertaintyDecomposition.tsx# Epistemic vs aleatoric
│       │   ├── ModelVersionComparison.tsx  # Version grouped bars
│       │   ├── HumanReviewRateChart.tsx    # Review rate over time
│       │   ├── ReviewTriggersPie.tsx       # Why cases get flagged
│       │   └── dashboardTheme.ts          # DASHBOARD_THEME tokens
│       └── tabs/
│           ├── OverviewTab.tsx             # KPIs + primary charts
│           ├── PerformanceTab.tsx          # Deep dive analytics
│           └── ModelIntelligenceTab.tsx    # Advanced model insights
├── hooks/
│   └── useMetrics.ts                      # Data fetching hooks
├── services/
│   ├── metricsApi.ts                      # Backend API client
│   └── localMetricsAggregator.ts          # Offline/demo aggregation
└── types/
    └── metrics.types.ts                   # Metric data interfaces

clinicalvision_backend/app/
├── api/v1/
│   └── analytics.py                       # Analytics endpoints
├── services/
│   └── analytics_service.py               # SQL aggregation + caching
└── schemas/
    └── analytics.py                       # Response schemas
```

## Appendix B: recharts Quick Reference

Since `recharts@3.6.0` is already installed, here are the key imports needed:

```typescript
// All imports from 'recharts' — no additional packages needed

// Charts
import { 
  AreaChart, BarChart, LineChart, PieChart, 
  RadialBarChart, ScatterChart, ComposedChart 
} from 'recharts';

// Chart elements
import { 
  Area, Bar, Line, Pie, Cell, Scatter, 
  RadialBar, ReferenceLine, ReferenceArea 
} from 'recharts';

// Axes & Grid
import { 
  XAxis, YAxis, ZAxis, CartesianGrid, 
  PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';

// Interactive
import { Tooltip, Legend, Brush, ResponsiveContainer } from 'recharts';

// Custom
import { Label, LabelList } from 'recharts';
```

## Appendix C: Color Palette for Charts

```
Clinical Risk Mapping:
  BI-RADS 1 (Negative)          → #22C55E (green-500)
  BI-RADS 2 (Benign)            → #86EFAC (green-300)
  BI-RADS 3 (Probably Benign)   → #F59E0B (amber-500)
  BI-RADS 4 (Suspicious)        → #F97316 (orange-500)
  BI-RADS 5 (Highly Suspicious) → #EF4444 (red-500)

Data Series:
  Primary series   → #00C9EA (LUNIT teal)
  Secondary series → #8B5CF6 (purple-500)
  Tertiary series  → #EC4899 (pink-500)
  Quaternary       → #14B8A6 (teal-500)

Backgrounds:
  Dashboard bg     → #0F1022
  Card surface     → #161832
  Card border      → rgba(0, 201, 234, 0.08)
  Grid lines       → rgba(255, 255, 255, 0.05)
  Axis text        → #6B7280

Semantic:
  Success/Positive → #22C55E
  Warning/Caution  → #F59E0B
  Error/Critical   → #EF4444
  Info/Neutral     → #00C9EA
```
