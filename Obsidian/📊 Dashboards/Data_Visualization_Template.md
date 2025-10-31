---
title: "Data Visualization Template"
component: "System"
type: "template"
date: "2024-01-15"
owner: "System Admin"
---

# Data Visualization Template

## Overview

This template provides standardized data visualization patterns for KPI dashboards using Dataview queries and inline calculations. Use this template to create charts, graphs, and visual representations of your metrics data.

## Chart Types & Patterns

### Trend Line Charts

#### Code Quality Trend (Last 30 Days)

```dataview
TABLE
  file.link as "Date",
  biome-score as "Biome Score",
  test-coverage as "Test Coverage %"
FROM "📈 Metrics"
WHERE date >= date(today) - dur(30 days)
SORT date desc
```

**Visualization**: Line chart showing quality metrics over time

#### Productivity Velocity (Last 14 Days)

```dataview
TABLE
  file.link as "Date",
  daily-commits as "Commits",
  lines-changed as "Lines Changed",
  story-points as "Story Points"
FROM "📈 Metrics"
WHERE date >= date(today) - dur(14 days)
SORT date desc
```

**Visualization**: Multi-line chart showing development velocity

### Bar Charts

#### Component Performance Comparison

```dataview
TABLE
  component as "Component",
  average(file.rows.biome-score) as "Avg Quality",
  average(file.rows.test-coverage) as "Avg Coverage",
  average(file.rows.deployment-frequency) as "Avg Deployments"
FROM "📈 Metrics"
GROUP BY component
```

**Visualization**: Grouped bar chart comparing component performance

#### Risk Distribution

```dataview
TABLE
  risk-level as "Risk Level",
  count(file.rows) as "Count"
FROM "📋 Projects"
GROUP BY risk-level
```

**Visualization**: Bar chart showing risk distribution across projects

### Pie Charts

#### Project Status Distribution

```dataview
TABLE
  status as "Status",
  count(file.rows) as "Count"
FROM "📋 Projects"
GROUP BY status
```

**Visualization**: Pie chart showing project status breakdown

#### Bug Severity Distribution

```dataview
TABLE
  severity as "Severity",
  sum(file.rows.bug-count) as "Total Bugs"
FROM "📈 Metrics"
WHERE date >= date(today) - dur(7 days)
GROUP BY severity
```

**Visualization**: Pie chart showing bug severity distribution

## KPI Calculations

### Automated KPI Formulas

#### Code Quality Index

```math
= (biome-score * 0.4) + (test-coverage * 0.4) + ((100 - complexity) * 0.2)
```

#### Productivity Score

```math
= (daily-commits * 0.3) + (story-points * 0.4) + (deployment-frequency * 0.3)
```

#### Health Score

```math
= (uptime * 0.4) + ((100 - mttr/24) * 0.3) + ((100 - critical-bugs) * 0.3)
```

#### Risk Score

```math
= (high-risk-projects * 10) + (blocked-tasks * 5) + technical-debt-score
```

### Trend Calculations

#### 7-Day Moving Average

```math
= average(map(file.rows, (row) => row.metric), date >= date(today) - dur(7 days))
```

#### Week-over-Week Change

```math
= ((current-week - previous-week) / previous-week) * 100
```

#### Trend Direction

```math
= if(change > 5, "↗️ Improving", if(change < -5, "↘️ Declining", "➡️ Stable"))
```

## Dashboard Components

### Status Indicators

#### Traffic Light System

- 🟢 **Green**: Metric >= Target
- 🟡 **Yellow**: Metric >= 80% of Target
- 🔴 **Red**: Metric < 80% of Target

#### KPI Status Table

| KPI | Current | Target | Status | Trend |
|-----|---------|--------|--------|-------|
| Code Quality | `= average(file.rows.biome-score)` | 85 | `= if(average(file.rows.biome-score) >= 85, "🟢", if(average(file.rows.biome-score) >= 68, "🟡", "🔴"))` | `= trend-direction` |
| Test Coverage | `= average(file.rows.test-coverage)` | 90 | `= if(average(file.rows.test-coverage) >= 90, "🟢", if(average(file.rows.test-coverage) >= 72, "🟡", "🔴"))` | `= trend-direction` |
| Deployment Freq | `= average(file.rows.deployment-frequency)` | 3 | `= if(average(file.rows.deployment-frequency) >= 3, "🟢", if(average(file.rows.deployment-frequency) >= 2.4, "🟡", "🔴"))` | `= trend-direction` |

### Progress Bars

#### Project Progress

```dataview
TABLE
  file.link as "Project",
  progress as "Progress",
  "<progress value='" + progress + "' max='100'></progress>" as "Progress Bar"
FROM "📋 Projects"
WHERE status != "Completed"
SORT progress desc
```

#### Sprint Burndown

```dataview
TABLE
  file.link as "Sprint",
  remaining-points as "Remaining",
  "<progress value='" + (total-points - remaining-points) + "' max='" + total-points + "'></progress>" as "Burndown"
FROM "📈 Metrics"
WHERE type = "sprint"
SORT date desc
LIMIT 1
```

## Advanced Visualizations

### Heat Maps

#### Daily Activity Heatmap

```dataview
TABLE
  date as "Date",
  daily-commits as "Commits",
  lines-changed as "Lines",
  bug-count as "Bugs"
FROM "📈 Metrics"
WHERE date >= date(today) - dur(30 days)
SORT date desc
```

**Visualization**: Calendar heatmap showing activity intensity

### Scatter Plots

#### Quality vs Productivity

```dataview
TABLE
  biome-score as "Quality",
  daily-commits as "Productivity",
  file.link as "Date"
FROM "📈 Metrics"
WHERE date >= date(today) - dur(30 days)
```

**Visualization**: Scatter plot showing quality-productivity correlation

### Time Series Analysis

#### Seasonal Trends

```dataview
TABLE
  date as "Date",
  biome-score as "Quality",
  month(date) as "Month",
  year(date) as "Year"
FROM "📈 Metrics"
WHERE date >= date(today) - dur(365 days)
SORT date desc
```

**Visualization**: Seasonal decomposition showing monthly patterns

## Custom Charts with CSS

### Progress Rings (CSS)

```html
<div class="progress-ring" style="--progress: 85;">
  <div class="progress-ring-circle">
    <div class="progress-ring-text">85%</div>
  </div>
</div>
```

### Status Badges

```html
<span class="status-badge status-good">🟢 Good</span>
<span class="status-badge status-warning">🟡 Warning</span>
<span class="status-badge status-critical">🔴 Critical</span>
```

## Implementation Guide

### Creating a New Dashboard

1. **Define Metrics Scope**: Identify which KPIs to track
2. **Set Data Sources**: Link to appropriate metric files
3. **Choose Visualization**: Select appropriate chart types
4. **Add Calculations**: Include automated KPI formulas
5. **Set Alerts**: Define thresholds and status indicators
6. **Schedule Updates**: Set review and update frequencies

### Best Practices

- **Consistency**: Use standardized chart types across dashboards
- **Clarity**: Include clear labels, legends, and data sources
- **Automation**: Leverage Dataview for real-time calculations
- **Accessibility**: Ensure color-blind friendly color schemes
- **Performance**: Limit queries to reasonable time ranges
- **Maintenance**: Include data validation and update schedules

### Template Usage

To use this template:

1. Copy the relevant sections to your dashboard
2. Replace folder paths with your specific component paths
3. Adjust date ranges and filters as needed
4. Customize KPI formulas for your metrics
5. Add component-specific visualizations

---

**Template Version:** 1.0
**Last Updated:** `=dateformat(date(today), "yyyy-MM-dd")`
**Compatible With:** Dataview 0.5.64+, Obsidian 1.4.0+

