---
title: Obsidian Notes
type: reference
project: ForgeMonorepo
status: draft
owner: GoblinOS
---

**Knowledge Base & Documentation Hub** - Central repository for all markdown (`.md`) notes, documentation, and knowledge base files within the ForgeMonorepo.

## 🎯 Purpose

This workspace maintains a clean separation between code and documentation, providing a centralized location for:

- 📝 **Project Documentation** - Setup guides, architecture docs, and tutorials
- 🔍 **Knowledge Base** - Notes, research, and reference materials
- 📋 **Meeting Notes** - Team discussions and decisions
- 🎯 **Specifications** - Feature specs, API designs, and technical requirements

## 📁 Structure

All `.md` files should be placed in this workspace folder to maintain organization:

```text
Obsidian/
├── 📖 docs/           # Formal documentation
├── 📝 notes/          # Working notes and research
├── 🎯 specs/          # Technical specifications
└── 📋 meetings/       # Meeting notes and decisions
```

## 📝 Naming Conventions

- 📄 **General files**: Use descriptive, lowercase filenames with hyphens: `my-note-topic.md`
- 📅 **Dated entries**: Prefix with ISO date: `2025-10-25-topic.md`
- 🎯 **Specifications**: Use structured naming: `spec-<area>-<topic>.md`
- 🏗️ **Architecture**: Use: `arch-<component>-<aspect>.md`

## 🚀 Usage

This folder is managed as a separate workspace root in VS Code. Access it via:

```bash
code /Users/fuaadabdullah/ForgeMonorepo/forge.code-workspace
```

## 🛠️ Maintenance Guidelines

### File Organization

- 📁 Keep a `README.md` or `.gitkeep` in every persistent subdirectory
- 🏷️ Use consistent folder structure across similar content types
- 🔄 Regularly review and archive outdated content

### Documentation Standards

- 📚 Follow the **Diátaxis documentation model** for user-facing content:
  - 📖 **Tutorials**: Learning-oriented, step-by-step guides
  - ❓ **How-to guides**: Problem-oriented, practical solutions
  - 📚 **Reference**: Information-oriented, technical descriptions
  - 💭 **Explanation**: Understanding-oriented, background concepts

### Metadata Requirements

- 📋 Update YAML front-matter when creating structured docs:

  ```yaml
  ---
  title: Document Title
  type: tutorial|how-to|reference|explanation
  project: ForgeTM|GoblinOS|ForgeMonorepo
  status: draft|reviewed|published
  owner: Team/Individual
  ---
  ```

### Content Quality

- ✅ Write in clear, concise language
- 🔗 Include relevant cross-references and links
- 📅 Keep content current and review periodically
- 🎯 Focus on actionable information

## 🔍 Search & Discovery

- 🔎 Use VS Code's search across the workspace to find content
- 🏷️ Leverage front-matter metadata for filtering
- 📖 Reference this documentation in code comments and PRs
- 🔗 Link between related documents for better navigation

## 🤝 Contributing

- ✍️ Anyone can add documentation - no special permissions required
- 👥 Use PRs for significant changes to review quality and accuracy
- 📝 Follow the established naming conventions and structure
- 🔄 Keep documentation synchronized with code changes
