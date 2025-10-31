# 🆕 Onboarding Checklist - ForgeMonorepo

## 🎯 Welcome to the GoblinOS Ecosystem

This checklist ensures new contributors understand the guild system, development practices, and quality standards. Complete all items before your first contribution.

### 📋 Pre-Onboarding (Before First Day)

- [ ] **Read Guild Charter**: Study [Guild_Glossary_and_Charter.md](../Obsidian/📋%20Projects/GoblinOS/Guild_Glossary_and_Charter.md)
- [ ] **Understand Guild System**: Learn Overmind → Guilds → Goblins hierarchy
- [ ] **Review LiteBrain Routing**: Understand model selection per guild domain
- [ ] **Install Prerequisites**: Python 3.11+, Node.js 20+, pnpm, VS Code
- [ ] **Setup Development Environment**: Clone repo, run `pnpm install`, configure VS Code workspace

### 🏛️ Day 1: Guild Orientation

- [ ] **Identify Your Guild**: Determine which guild owns your work domain
  - Code/Build/Infrastructure → **Forge Guild** (Dregg Embercode)
  - UI/UX/Design/APIs → **Crafters Guild** (Vanta Lumin / Volt Furnace)
  - Testing/Monitoring → **Huntress Guild** (Magnolia Nightbloom / Mags Charietto)
  - Security/Secrets/Compliance → **Keepers Guild** (Sentenial Ledgerwarden)
  - Quality Gates/Documentation → **Mages Guild** (Launcey Gauge)
- [ ] **Learn Guild KPIs**: Understand your guild's performance targets and quality standards
- [ ] **Setup LiteBrain Routing**: Configure appropriate models for your guild work
- [ ] **Review Quality Gates**: Understand PR gates that apply to your guild

### 🔧 Day 1-2: Technical Setup

- [ ] **Environment Configuration**:
  - [ ] Copy `.env.example` to `.env`
  - [ ] Setup SOPS for secret decryption (if needed)
  - [ ] Configure API keys following [API_KEYS_MANAGEMENT.md](../Obsidian/🔐%20Security%20&%20Keys/API_KEYS_MANAGEMENT.md)
- [ ] **Development Tools**:
  - [ ] Install Forge Guild CLI (`pnpm forge-guild doctor` works)
  - [ ] Setup VS Code tasks and debugging
  - [ ] Configure linting and formatting (Biome)
  - [ ] Test development workflow (`pnpm forge-guild check`)
- [ ] **Project Familiarization**:
  - [ ] Read main [README.md](../README.md)
  - [ ] Understand project structure and workspace folders
  - [ ] Review [CONTRIBUTING.md](../CONTRIBUTING.md) guidelines

### 🧪 Day 2-3: Development Workflow

- [ ] **Run Development Stack**:
  - [ ] Execute `dev:stack` VS Code task
  - [ ] Verify all services start correctly
  - [ ] Test basic functionality (health endpoints, UI access)
- [ ] **Quality Assurance**:
  - [ ] Run `tools/lint_all.sh` (should pass)
  - [ ] Execute `pnpm test` and `pytest` (understand test structure)
  - [ ] Review pre-commit hooks (`pre-commit run --all-files`)
- [ ] **Guild-Specific Setup**:
  - [ ] **Forge Guild**: Review build performance benchmarks
  - [ ] **Crafters Guild**: Study design tokens and accessibility standards
  - [ ] **Huntress Guild**: Understand testing frameworks and coverage goals
  - [ ] **Keepers Guild**: Learn secret management and compliance procedures
  - [ ] **Mages Guild**: Review documentation standards and gate configurations

### 📚 Day 3-4: Documentation & Knowledge Base

- [ ] **Obsidian Knowledge Base**:
  - [ ] Navigate project documentation structure
  - [ ] Understand Diátaxis framework (tutorials, reference, how-to, conceptual)
  - [ ] Find relevant guides for your guild domain
- [ ] **API Documentation**:
  - [ ] Review OpenAPI specs and endpoint documentation
  - [ ] Understand API versioning and schema standards
  - [ ] Study authentication and authorization patterns
- [ ] **Code Documentation**:
  - [ ] Review inline documentation standards
  - [ ] Understand code commenting conventions
  - [ ] Study architectural decision records (ADRs)

### 🚀 Day 4-5: First Contribution

- [ ] **Select First Task**:
  - [ ] Choose guild-appropriate issue or task
  - [ ] Understand acceptance criteria and KPIs
  - [ ] Plan implementation following guild standards
- [ ] **Implement Changes**:
  - [ ] Create feature branch with descriptive name
  - [ ] Follow guild coding standards and patterns
  - [ ] Write tests for new functionality
  - [ ] Update documentation as needed
- [ ] **Quality Validation**:
  - [ ] Run all quality checks (lint, test, security)
  - [ ] Verify guild KPIs are met
  - [ ] Test in development environment
- [ ] **Submit for Review**:
  - [ ] Create pull request with guild context
  - [ ] Tag appropriate guild reviewers
  - [ ] Address review feedback following guild standards

### 🎓 Ongoing Learning & Compliance

- [ ] **Weekly Guild Check-ins**: Attend guild standups and reviews
- [ ] **Quality Gate Compliance**: Ensure all PRs pass relevant guild gates
- [ ] **Documentation Updates**: Keep docs current with code changes
- [ ] **Security Awareness**: Follow Keepers Guild security practices
- [ ] **Performance Monitoring**: Track guild KPIs and improvement opportunities

### 📞 Support & Resources

**Need Help? Contact Your Guild:**

- **Forge Guild**: Dregg Embercode (build/infra questions)
- **Crafters Guild**: Vanta Lumin (UI/UX), Volt Furnace (APIs)
- **Huntress Guild**: Magnolia Nightbloom (testing), Mags Charietto (monitoring)
- **Keepers Guild**: Sentenial Ledgerwarden (security/compliance)
- **Mages Guild**: Launcey Gauge (gates), Hex Oracle (forecasting), Grim Rune (anomalies)

**Key Resources:**

- [Guild Charter](../Obsidian/📋%20Projects/GoblinOS/Guild_Glossary_and_Charter.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [API Keys Management](../Obsidian/🔐%20Security%20&%20Keys/API_KEYS_MANAGEMENT.md)
- [Development Tasks](.vscode/tasks.json)

---

## ✅ Completion Sign-off

**Mentor/Reviewer Checklist:**

- [ ] Guild assignment confirmed and appropriate
- [ ] Development environment properly configured
- [ ] Quality standards understood and demonstrated
- [ ] First contribution successfully merged
- [ ] Guild KPIs and responsibilities clear

**Onboarding Complete:** Welcome to the GoblinOS ecosystem! Your contributions now support autonomous goblin operations. 🎉
