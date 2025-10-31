# Baseline Metrics Template

---
template: baseline-metrics
type: metrics-template
description: Template for establishing baseline metrics and historical tracking
---

## Purpose

This template establishes baseline metrics for development tracking and provides historical context for KPI analysis.

## Component Baseline Configuration

### {{component}} Baseline Metrics ({{date}})

#### Code Quality Baselines

- **Target Biome Score:** 90+
- **Target Test Coverage:** 85%+
- **Target Complexity:** < 2.0
- **Historical Average:** {{historical_avg_biome}}/100

#### Productivity Baselines

- **Target Daily Commits:** 5-15
- **Target Story Points:** 8-13 per day
- **Target PR Merge Rate:** 2-3 per day
- **Historical Average:** {{historical_avg_commits}} commits/day

#### Quality Baselines

- **Target Uptime:** 99.5%+
- **Target Error Rate:** < 0.1%
- **Target Response Time:** < 100ms
- **Historical Average:** {{historical_avg_uptime}}% uptime

## Historical Trends (Last 30 Days)

### Code Quality Trend

```dataview
TABLE WITHOUT ID
  dateformat(date, "MM-dd") as "Date",
  biome-score as "Biome Score",
  test-coverage as "Test Coverage"
FROM "📈 Metrics/{{component}}"
WHERE date >= date(today) - dur(30 days)
SORT date asc
```

### Productivity Trend

```dataview
TABLE WITHOUT ID
  dateformat(date, "MM-dd") as "Date",
  daily-commits as "Commits",
  story-points-completed as "Story Points"
FROM "📈 Metrics/{{component}}"
WHERE date >= date(today) - dur(30 days)
SORT date asc
```

## KPI Targets & Alerts

### Alert Thresholds

- **Code Quality Alert:** Biome score < 85
- **Coverage Alert:** Test coverage < 80%
- **Productivity Alert:** < 3 commits/day for 3+ days
- **Quality Alert:** Uptime < 99% or error rate > 1%

### Monthly Targets

- **Code Quality:** Maintain 90+ Biome score
- **Test Coverage:** Achieve 90%+ coverage
- **Productivity:** 200+ commits/month
- **Quality:** 99.9%+ uptime

## Improvement Initiatives

### Current Focus Areas

- [ ] Improve automated testing coverage
- [ ] Reduce code complexity scores
- [ ] Enhance CI/CD pipeline efficiency
- [ ] Implement comprehensive monitoring

### Success Metrics

- **Quality Improvement:** +5% Biome score improvement
- **Coverage Increase:** +10% test coverage
- **Productivity Gain:** +20% development velocity
- **Quality Enhancement:** -50% error rates

## Data Collection & Validation

### Automated Sources

- **Git Metrics:** GitHub API integration
- **Code Quality:** Biome linting reports
- **Testing:** Vitest/pytest coverage reports
- **Health:** Application monitoring systems

### Manual Validation

- [ ] Weekly metrics review meeting
- [ ] Monthly KPI assessment
- [ ] Quarterly goal alignment
- [ ] Annual target calibration

---

**Template Version:** 1.0
**Last Updated:** {{date}}
**Next Review:** Monthly
