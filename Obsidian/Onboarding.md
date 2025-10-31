---
title: "ForgeGoblinVault Onboarding"
type: "how-to"
component: "Cross-Project"
status: "active"
owner: "@fuaadabdullah"
last-reviewed: "2025-10-30"
---

# 🚀 ForgeGoblinVault Onboarding Guide

## Welcome to the ForgeGoblinVault! 🎉

This guide will get you set up with our world-class Obsidian knowledge management system in under 30 minutes. The vault serves as the central nervous system for ForgeTM and GoblinOS development.

## 📋 Prerequisites

- VS Code + the `forge.code-workspace` open
- Basic familiarity with Markdown + Dataview blocks
- 30 minutes of focused setup time
- Optional: Slack/Teams ready for status updates (dashboard quick actions reference them)

## 🏁 Quick Start Checklist

### Step 1: Open the Workspace (2 minutes)

```bash
# Open the monorepo workspace
code /Users/fuaadabdullah/ForgeMonorepo/forge.code-workspace

# Navigate to the Obsidian folder in VS Code Explorer
# You should see the ForgeGoblinVault structure
```

**✅ Checkpoint:** Can you see the 📊 Dashboards/, 📋 Projects/, and 🔄 Workflows/ folders?

### Step 2: Install Obsidian (5 minutes)

1. Download and install Obsidian from [obsidian.md](https://obsidian.md)
2. Open Obsidian
3. Click "Open folder as vault"
4. Navigate to: `/Users/fuaadabdullah/ForgeMonorepo/Obsidian`
5. Name the vault: `ForgeGoblinVault`

**✅ Checkpoint:** Vault opens without errors and shows the folder structure.

### Step 3: Install Required Plugins (10 minutes)

Go to Settings → Community plugins → Browse

#### Required Plugins (install and enable)

- **📊 Dataview** - Dynamic queries and dashboards
- **📝 Templater** - Automated note creation
- **📋 Kanban** - Workflow management
- **📅 Calendar** - Timeline tracking (optional)

#### Installation Steps

1. Search for each plugin by name
2. Click Install
3. Click Enable
4. Restart Obsidian if prompted

**✅ Checkpoint:** All plugins show as "Enabled" in Settings → Community plugins.

### Step 4: Configure Templater (5 minutes)

1. Go to Settings → Community plugins → Templater
2. Set "Template folder location" to: `🔄 Workflows/`
3. Enable "Trigger Templater on new file creation"
4. Set "Timeout" to 10 seconds
5. Enable "Enable system commands" (if you want advanced features)

**✅ Checkpoint:** Templater settings are saved and no errors appear.

### Step 5: Run Validation Script (3 minutes)

```bash
# From the monorepo root
cd /Users/fuaadabdullah/ForgeMonorepo
bash tools/validate_forge_vault.sh
```

**Expected Output:**

```bash
🔍 ForgeGoblinVault Setup Validation
====================================
📁 Checking vault structure...
✅ .obsidian directory exists
🔧 Checking plugin configurations...
✅ dataview plugin directory exists
✅ templater-obsidian plugin directory exists
✅ obsidian-kanban plugin directory exists
⚙️ Checking custom functions...
✅ Custom Templater functions exist
✅ calculateKPIStatus function found
📊 Checking intelligent dashboard...
✅ Intelligent dashboard exists
✅ DataviewJS queries found
✅ Templater quick actions found
📝 Checking workflow templates...
✅ [All templates exist]
📈 Checking metrics structure...
✅ Metrics directories exist

🚀 ForgeGoblinVault is ready for development intelligence!
```

**✅ Checkpoint:** All checks pass with ✅ marks.

### Step 5.5: Link Core Docs (2 minutes)

- Pin these high-signal files in Obsidian's Starred list:
  - `📊 Dashboards/Intelligent_Development_Dashboard.md`
  - `📋 Projects/GoblinOS/Smithy_Overmind_Finalization.md`
  - `📈 Metrics/GoblinOS/2025-10-30_Smithy_Overmind_Baseline.md`
  - `🛠️ Tools/PLUGIN_VERSIONS.md`
- These files drive our quarterly objectives, KPI reviews, and plugin hygiene. Update them whenever you ship meaningful work.

### Step 6: First Dashboard Experience (5 minutes)

1. Open the main dashboard: `[[📊 Dashboards/Intelligent Development Dashboard]]`
2. Click the "🏠 Home" button to explore sections
3. Try the "📊 View System Health" button
4. Click "📈 Log Daily Metrics" to create your first metric entry

**✅ Checkpoint:** Dashboard loads, buttons work, and you can navigate between sections.

## 🎯 Daily Workflow

### Morning Standup (5 minutes)

1. Open `[[📊 Dashboards/Intelligent Development Dashboard]]`
2. Review system health metrics
3. Check for critical alerts
4. Log your daily metrics using the quick action

### During Development

- Create project notes in `📋 Projects/[Component]/`
- Document decisions in `📚 Knowledge/`
- Track progress in relevant metrics files

### End of Day

- Update project statuses
- Log any blockers or achievements
- Review goals progress
- If you touched Smithy/Overmind, add a short note under the latest metrics entry linking to logs or CI output.

## 📚 Key Resources

### Essential Reading

- `[[📊 Dashboards/Intelligent Development Dashboard]]` - Your daily hub
- `[[Obsidian_System_Plan.md]]` - Detailed system architecture
- `[[VAULT_PHASES.md]]` - Implementation history
- `🛠️ Tools/PLUGIN_VERSIONS.md` - Plugin compatibility

### Templates to Know

- **Feature Development Lifecycle** - For new projects
- **Metrics Template** - For KPI tracking
- **Code Review Process** - For PR documentation
- **Knowledge Management** - For technical documentation

## 🛡️ Sustain the Vault

| Cadence | Task | Where |
|---------|------|-------|
| Weekly  | Run `bash tools/validate_forge_vault.sh` and log notes in `📈 Metrics` | Root shell + metrics entry |
| Weekly  | Add daily metrics via dashboard quick action (ForgeTM + GoblinOS) | Dashboard |
| Monthly | Review `🛠️ Tools/PLUGIN_VERSIONS.md`, bump versions if safe, record test date | Tools |
| Quarterly | Refresh `Obsidian/Onboarding.md` + dashboards based on lessons learned | Obsidian |

- Always update the relevant docs (plan, metrics, plugin versions) when you change automation, routing, or vault behavior.

## 🆘 Troubleshooting

### Common Issues

**"Plugin not found" errors:**

- Ensure all required plugins are installed and enabled
- Restart Obsidian completely

**Dataview not updating:**

- Refresh the vault (Ctrl/Cmd + R)
- Check plugin is enabled
- Verify query syntax in the Dataview pane

**Templater not working:**

- Check template folder path in settings
- Ensure templates exist in `🔄 Workflows/`
- Try creating a new file with a template

**Links not working:**

- Use `[[File Name]]` syntax
- Check for typos
- Use Ctrl/Cmd + O for link suggestions

### Getting Help

1. Check `[[📚 Knowledge/Troubleshooting Guide]]`
2. Review `[[🔄 Workflows/Getting Started]]`
3. Run the validation script: `bash tools/validate_forge_vault.sh`
4. Contact the vault maintainer or team lead

## 🎉 You're All Set

Welcome to the ForgeGoblinVault! You've successfully set up our intelligent development knowledge management system. The vault will help you:

- 📊 Track KPIs and system health in real-time
- 📋 Manage projects with automated workflows
- 📈 Monitor development metrics and trends
- 🎯 Align work with team goals and objectives
- 📚 Preserve and share institutional knowledge

### Next Steps

- Explore the dashboard features
- Create your first project using the templates
- Start logging daily metrics
- Join the next team standup to share your experience

---

**Need help?** Contact the vault owner or check the troubleshooting section above.

**Last Updated:** October 27, 2025
