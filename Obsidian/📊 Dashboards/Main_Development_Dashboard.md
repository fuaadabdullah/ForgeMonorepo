# Development Dashboard

## Overview

**Last Updated:** `=dateformat(date(today), "yyyy-MM-dd HH:mm")`
**Period:** [Daily/Weekly/Monthly]

## Key Metrics

### Project Health

```dataview
TABLE
  status as "Status",
  priority as "Priority",
  component as "Component"
FROM "📋 Projects"
WHERE status != "Completed"
SORT priority desc, status asc
```

### Active Projects by Component

```dataview
TABLE
  rows.file.link as "Project",
  status as "Status",
  priority as "Priority"
FROM "📋 Projects"
WHERE component = "ForgeTM" AND status != "Completed"
SORT priority desc
```

```dataview
TABLE
  rows.file.link as "Project",
  status as "Status",
  priority as "Priority"
FROM "📋 Projects"
WHERE component = "GoblinOS" AND status != "Completed"
SORT priority desc
```

### Recent Development Logs

```dataview
TABLE
  date as "Date",
  focus-area as "Focus",
  rows.file.link as "Log"
FROM "📅 Planning"
WHERE date >= date(today) - dur(7 days)
SORT date desc
LIMIT 10
```

## Quality Metrics

### Code Quality Status

- **Linting:** [Current status]
- **Test Coverage:** [Current percentage]
- **Build Status:** [Pass/Fail]

### Recent Issues & Resolutions

```dataview
TABLE
  issue as "Issue",
  impact as "Impact",
  resolution as "Resolution"
FROM "📈 Metrics"
WHERE date >= date(today) - dur(7 days)
SORT date desc
```

## Workflow Efficiency

### Sprint Progress

- **Completed Stories:** [X/Y]
- **Velocity:** [Points per sprint]
- **Burndown:** [On track/Behind/Ahead]

### Time Allocation

- **Development:** [X%]
- **Code Review:** [X%]
- **Meetings:** [X%]
- **Documentation:** [X%]

## Goals & Objectives

### Current Sprint Goals

```dataview
TABLE
  goal as "Goal",
  status as "Status",
  owner as "Owner"
FROM "🎯 Goals"
WHERE sprint = "[Current Sprint]"
SORT status asc
```

### Key Results

- [ ] [KPI 1] - [Current/Target]
- [ ] [KPI 2] - [Current/Target]
- [ ] [KPI 3] - [Current/Target]

## Risk Assessment

### High Priority Risks

```dataview
TABLE
  risk as "Risk",
  impact as "Impact",
  mitigation as "Mitigation"
FROM "📈 Metrics"
WHERE impact = "High" AND status = "Active"
SORT date desc
```

## Quick Actions

- [[Create New Project|📋 Projects/Project_Template]]
- [[Start Daily Log|📅 Planning/Daily_Development_Log_`=dateformat(date(today), "yyyy-MM-dd")`]]
- [[Review Metrics|📈 Metrics/Weekly_Metrics_Review]]
- [[Update Goals|🎯 Goals/Sprint_Goals]]

## Recent Updates

```dataview
TABLE
  date as "Date",
  type as "Type",
  summary as "Summary",
  rows.file.link as "Link"
FROM ""
WHERE date >= date(today) - dur(3 days)
SORT date desc
LIMIT 15
```

---
Dashboard refreshes automatically with Dataview plugin
