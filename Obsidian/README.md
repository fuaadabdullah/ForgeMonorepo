# 🌟 World-Class Obsidian Development Knowledge Management System

## 📖 Overview

This Obsidian vault serves as the central nervous system for ForgeTM and GoblinOS development, providing comprehensive knowledge management, real-time KPI tracking, and optimized development workflows.

## 🚀 Quick Start

### 1. 📂 Open the Vault

```bash
code /Users/fuaadabdullah/ForgeMonorepo/forge.code-workspace
# Navigate to ForgeGoblinVault folder
```

### 2. 🔌 Install Required Plugins

Install these plugins from Obsidian's Community Plugins:

- **📊 Dataview** - Dynamic queries and dashboards
- **📝 Templater** - Automated note creation with custom functions
- **📋 Kanban** - Workflow management and project boards
- **📅 Calendar** - Timeline tracking (optional)

For pinned plugin versions and compatibility notes, see `🛠️ Tools/PLUGIN_VERSIONS.md`.

### 3. 🌅 Start Your Day

1. Open [[📊 Dashboards/Intelligent Development Dashboard]]
2. Create daily metrics: Use the "Log Daily Metrics" quick action
3. Review active projects and automated alerts

## Folder Structure

```text
ForgeGoblinVault/
├── 📊 Dashboards/           # Intelligent dashboards and analytics
│   ├── Intelligent_Development_Dashboard.md  # Main automated dashboard
│   ├── ForgeTM_KPI_Dashboard.md             # Backend/frontend KPIs
│   └── GoblinOS_KPI_Dashboard.md            # Agent development KPIs
├── 📋 Projects/            # Active development projects
│   ├── ForgeTM/            # Backend/frontend projects
│   └── GoblinOS/           # Agent development projects
├── 🔄 Workflows/           # Development processes and templates
│   ├── ForgeTM/            # Component-specific workflows
│   └── GoblinOS/           # Component-specific workflows
├── 📈 Metrics/             # KPI tracking and performance data
│   ├── ForgeTM/            # Backend/frontend metrics
│   └── GoblinOS/           # Agent development metrics
├── 🎯 Goals/               # Objectives and roadmap tracking
├── 📚 Knowledge/           # Technical documentation and insights
│   ├── VS_Code_Terminal_Shell_Integration.md  # Terminal integration guide
│   └── [Additional technical docs]
├── 🛠️ Tools/              # Development tooling and automation
├── 👥 Team/                # Team coordination and communication
└── 📅 Planning/            # Sprint planning and retrospectives
```

## Key Workflows

### Starting a New Project

1. Use the "Create New Project" quick action in [[� Dashboards/Intelligent Development Dashboard]]
2. Fill in project details using the Feature Development Lifecycle template
3. Project automatically appears in active projects list
4. Link to dashboard and relevant metrics

### Daily Development

1. Open [[📊 Dashboards/Intelligent Development Dashboard]]
2. Use "Log Daily Metrics" quick action for automated KPI entry
3. Review automated alerts and critical issues
4. Track progress against goals with real-time visualizations

### Sprint Planning

1. Review [[📊 Dashboards/Intelligent Development Dashboard]] for system health
2. Set sprint goals in [[🎯 Goals/]]
3. Create sprint backlog in [[📅 Planning/]]
4. Monitor burndown charts and automated progress tracking

## Templates Available

- **Feature Development Lifecycle Template** - Complete project workflow
- **Metrics Template** - Automated KPI entry with status calculations
- **Code Review Process Template** - PR review documentation
- **Testing & QA Workflow Template** - Quality assurance processes
- **Knowledge Management Template** - Documentation creation
- **Team Coordination Framework Template** - Meeting and communication

## Automation Features

### Templater Functions

Custom JavaScript functions available in templates:

- `calculateKPIStatus(current, target, type)` - Automated KPI health assessment
- `generateBurndownData()` - Sprint progress calculations
- `generateProjectId()` - Standardized project ID generation
- `calculateTeamCapacity()` - Resource utilization tracking
- `assessRisk()` - Risk evaluation and prioritization

### Dataview Queries

#### System Health Overview

```dataview
TABLE
  status as "Status",
  format(average, ".1f") as "Average",
  format(trend, ".1f") as "Trend",
  target as "Target"
FROM "� Metrics"
WHERE component != null
GROUP BY component
```

#### Active Projects Status

```dataview
TABLE WITHOUT ID
  file.link as "Project",
  status as "Status",
  priority as "Priority",
  format(date(due-date), "MMM dd") as "Due",
  progress as "Progress"
FROM "� Projects"
WHERE status != "completed"
SORT priority desc, due-date asc
```

#### Critical Issues Alert

```dataview
LIST
FROM "📈 Metrics"
WHERE status = "🔴 critical" OR status = "🟠 needs-improvement"
SORT priority desc
```

## Best Practices

### File Naming

- Use `YYYY-MM-DD_Description.md` for date-based files
- Use `Component_Feature.md` for feature documentation
- Use `KPI_Metric.md` for metrics tracking

### Linking

- Use `[[File Name]]` for internal links
- Use `[[#Section]]` for section links
- Use `[[File Name#Section]]` for specific sections

### Tags

- `#project/[name]` - Project-related content
- `#component/[forge|goblin]` - Component classification
- `#priority/[high|medium|low]` - Priority levels
- `#status/[active|completed|blocked]` - Status tracking

### Properties (YAML Frontmatter)

```yaml
---
title: "Document Title"
component: "ForgeTM" | "GoblinOS" | "Cross-Project"
priority: "High" | "Medium" | "Low"
status: "Planning" | "Active" | "Completed" | "On-Hold"
date: "2024-01-15"
owner: "Developer Name"
---
```

## Maintenance

### Weekly Tasks

- [ ] Review [[📊 Dashboards/Main Development Dashboard]]
- [ ] Update project statuses
- [ ] Archive completed items
- [ ] Review metrics trends

### Monthly Tasks

- [ ] Clean up old logs (archive after 3 months)
- [ ] Update templates based on feedback
- [ ] Review and update goals
- [ ] Audit link integrity

### Quarterly Tasks

- [ ] Major template updates
- [ ] Plugin updates and optimizations
- [ ] System performance review
- [ ] User feedback collection

## Troubleshooting

### Common Issues

**Dataview not updating:**

- Check plugin is enabled
- Refresh the vault (Ctrl/Cmd + R)
- Verify query syntax

**Links not working:**

- Ensure correct file naming
- Check for typos in link syntax
- Use the link suggestion feature (Ctrl/Cmd + O)

**Templates not working:**

- Verify Templater plugin is enabled
- Check template file exists
- Review template syntax

### Getting Help

- Check [[📚 Knowledge/Troubleshooting Guide]]
- Review [[🔄 Workflows/Getting Started]]
- Contact team lead for system issues

## Contributing

### Adding New Templates

1. Create template in [[🔄 Workflows/]]
2. Document usage in this README
3. Test with different scenarios
4. Update examples and best practices

### Modifying Dashboards

1. Backup current dashboard
2. Test Dataview queries
3. Update documentation
4. Review with team

### System Improvements

1. Document proposed changes
2. Test impact on existing workflows
3. Update this README
4. Train team on new features

---

## System Status
## System Status

**Phase:** 4 (Intelligence & Automation) - ✅ Complete
**Follow-ups:** All 5 items - ✅ Complete
**Vault Name:** ForgeGoblinVault
**Last Updated:** October 27, 2025
**Total Files:** 66 markdown documents
**CI Status:** Automated validation active

For a compact record of the phases, completion dates, owners and recommended follow-ups see `VAULT_PHASES.md`.

### ✅ Completed Phases (summary)

- **Phase 1**: Foundation structure and templates (completed 2025-09-10)
- **Phase 2**: KPI tracking system & dashboards (completed 2025-10-01)
- **Phase 3**: Workflow optimization with templates (completed 2025-10-12)
- **Phase 4**: Intelligence & automation (completed 2025-10-26)

### ✅ Completed Follow-ups (summary)

- **Ownership & Rotation**: Rotating maintenance system established
- **Plugin Documentation**: Version compatibility matrix maintained
- **Onboarding Guide**: Comprehensive 30-minute setup process
- **CI Automation**: Weekly validation and link checking
- **Review Cadence**: Monthly/quarterly maintenance processes

### 🚀 Ready for Activation

1. Open vault in Obsidian
2. Install community plugins (Dataview, Templater, Kanban)
3. Enable plugins in settings
4. Start using [[📊 Dashboards/Intelligent Development Dashboard]]

For the detailed implementation plan and rollout notes see [[Obsidian_System_Plan.md]] and [[VAULT_PHASES.md]].
