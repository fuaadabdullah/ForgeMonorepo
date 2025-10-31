---
title: "ForgeTM KPI Dashboard"
component: "ForgeTM"
type: "dashboard"
date: "2024-01-15"
owner: "ForgeTM Team"
---

# ForgeTM KPI Dashboard

## Overview

Real-time performance dashboard for ForgeTM backend and frontend development, tracking code quality, productivity, and project health metrics.

## Code Quality Metrics

### Current Status

```dataview
TABLE
  file.link as "Date",
  biome-score as "Biome Score",
  ts-errors as "TypeScript Errors",
  test-coverage as "Test Coverage"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(7 days)
SORT date desc
LIMIT 7
```

### Quality Trends

```dataview
TABLE
  file.link as "Date",
  biome-score as "Biome",
  test-coverage as "Coverage %",
  complexity as "Complexity"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(30 days)
SORT date desc
```

## Productivity Metrics

### Development Velocity

```dataview
TABLE
  file.link as "Date",
  daily-commits as "Commits",
  lines-changed as "Lines Changed",
  pr-merge-rate as "PRs/Day"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(7 days)
SORT date desc
```

### Feature Delivery

```dataview
TABLE
  file.link as "Date",
  story-points as "Story Points",
  feature-delivery as "Features/Sprint",
  deployment-frequency as "Deployments/Week"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(14 days)
SORT date desc
```

## Quality Assurance

### Bug Tracking

```dataview
TABLE
  file.link as "Date",
  new-bugs as "New Bugs",
  bugs-resolved as "Resolved",
  critical-bugs as "Critical Bugs",
  mttr as "MTTR (hrs)"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(7 days)
SORT date desc
```

### System Health

```dataview
TABLE
  file.link as "Date",
  incidents as "Incidents",
  uptime as "Uptime %",
  response-time as "Response Time (min)",
  rollbacks as "Rollbacks"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(7 days)
SORT date desc
```

## Project Health

### Active Projects

```dataview
TABLE
  file.link as "Project",
  status as "Status",
  priority as "Priority",
  progress as "Progress %",
  due-date as "Due Date"
FROM "📋 Projects/ForgeTM"
WHERE status != "Completed"
SORT priority desc, due-date asc
```

### Risk Assessment

```dataview
TABLE
  file.link as "Project",
  risk-level as "Risk Level",
  blocked-tasks as "Blocked Tasks",
  technical-debt as "Tech Debt",
  mitigation-plan as "Mitigation"
FROM "📋 Projects/ForgeTM"
WHERE risk-level = "High" OR risk-level = "Critical"
SORT risk-level desc
```

## Team Performance

### Code Review Metrics

```dataview
TABLE
  file.link as "Date",
  reviews-completed as "Reviews Done",
  avg-review-time as "Avg Time (hrs)",
  review-quality as "Quality Score"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(7 days)
SORT date desc
```

### Learning & Growth

```dataview
TABLE
  file.link as "Date",
  docs-created as "New Docs",
  docs-updated as "Doc Updates",
  training-hours as "Training Hours"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(30 days)
SORT date desc
```

## Key Performance Indicators

### Primary KPIs

- **Code Quality Score**: `= average(map(file.rows, (row) => row.biome-score))` (Target: >85)
- **Test Coverage**: `= average(map(file.rows, (row) => row.test-coverage))`% (Target: >90%)
- **Deployment Frequency**: `= average(map(file.rows, (row) => row.deployment-frequency))` per week (Target: 3+)
- **Mean Time to Resolution**: `= average(map(file.rows, (row) => row.mttr))` hours (Target: <24)
- **System Uptime**: `= average(map(file.rows, (row) => row.uptime))`% (Target: >99.5%)

### Trend Analysis

```dataview
TABLE
  file.link as "Date",
  biome-score as "Quality",
  test-coverage as "Coverage",
  deployment-frequency as "Deployments"
FROM "📈 Metrics/ForgeTM"
WHERE date >= date(today) - dur(90 days)
SORT date desc
```

## Action Items & Alerts

### Critical Issues

```dataview
LIST
FROM "📈 Metrics/ForgeTM"
WHERE critical-bugs > 0 OR incidents > 0 OR uptime < 99.5
SORT date desc
```

### Improvement Opportunities

```dataview
LIST
FROM "📈 Metrics/ForgeTM"
WHERE biome-score < 80 OR test-coverage < 85
SORT date desc
```

## Recent Activity

### Latest Metrics Update

```dataview
TABLE
  file.link as "Latest Update",
  date as "Date",
  biome-score as "Quality Score",
  test-coverage as "Coverage"
FROM "📈 Metrics/ForgeTM"
SORT date desc
LIMIT 1
```

### Recent Projects

```dataview
TABLE
  file.link as "Project",
  status as "Status",
  last-updated as "Last Update"
FROM "📋 Projects/ForgeTM"
SORT last-updated desc
LIMIT 5
```

---

**Dashboard Last Updated:** `=dateformat(date(today), "yyyy-MM-dd HH:mm")`
**Next Review:** `=dateformat(date(today) + dur(1 day), "yyyy-MM-dd")`
**Data Source:** [[📈 Metrics/Metrics_Template]]

