# Phase 6: Observability & Rollout - Migration Notes

## Overview
Phase 6 introduces comprehensive observability infrastructure and controlled rollout procedures for the guild-based quality assurance system. This phase establishes router audit logging, dashboards, and phased deployment strategies.

## What Changed

### 🔄 Router Audit Logging Infrastructure
- **New API Endpoints**: Added `/v1/router-audit` and `/v1/guild-kpi` endpoints
- **Router Audit Logger**: Singleton utility class for standardized logging across guilds
- **Integration**: Automatic logging in `useChat` hook for all routing decisions
- **Structured Logging**: All router decisions now logged to `goblinos.overmind.router-audit`

### 📊 Dashboard Components
- **RouterAuditDashboard**: Real-time monitoring of router decisions and guild KPIs
- **KPI Metrics Display**: Current metrics, targets, and trends for all guilds
- **Audit Log Viewer**: Recent routing decisions with success/failure status
- **Auto-refresh**: 30s for logs, 60s for metrics

### 🎯 Guild-Specific Logging Methods
- `logForgeDecision()`: Build time and performance metrics
- `logCraftersDecision()`: CLS scores and UI metrics
- `logKeepersDecision()`: Security scores and compliance
- `logHuntressDecision()`: Test coverage and quality metrics
- `logMagesDecision()`: Quality gates and routing orchestration

## What Teammates Need to Do

### Immediate Actions (Required)
1. **Review Router Audit Logs**: Check `goblinos.overmind.router-audit` for routing patterns
2. **Update Guild KPIs**: Ensure your guild's KPI tracking is active
3. **Monitor Dashboards**: Use RouterAuditDashboard for real-time observability

### Scripts to Re-run
```bash
# Re-run full quality gates (includes new router audit checks)
pnpm run quality-gates

# Update guild KPI baselines
pnpm run update-kpi-baselines

# Validate router audit logging
pnpm run validate-router-audit
```

### Cache Regeneration
```bash
# Clear router decision cache
rm -rf .cache/router-decisions

# Regenerate KPI baselines
pnpm run regenerate-kpi-baselines

# Update audit log indexes
pnpm run rebuild-audit-indexes
```

## Phased Rollout Plan

### Phase 6a: Development Environment
- ✅ Router audit logging infrastructure deployed
- ✅ Dashboard components implemented
- ✅ Integration with useChat hook complete
- ⏳ Backend endpoints for `/v1/router-audit` and `/v1/guild-kpi` (pending)

**Smoke Tests**:
```bash
# Test router audit logging
pnpm run test:router-audit

# Test dashboard rendering
pnpm run test:dashboard

# Validate KPI metrics collection
pnpm run test:kpi-metrics
```

**Rollback Checkpoint**: If issues detected, disable router audit logging via feature flag.

### Phase 6b: Staging Environment (Next Week)
- Deploy observability stack to staging
- Enable real-time KPI monitoring
- Test guild-specific alerting
- Validate audit log retention policies

### Phase 6c: Production Rollout (Following Week)
- Gradual rollout with 10% traffic initially
- Monitor for performance impact
- Enable production alerting
- Establish KPI dashboards for all guilds

## Breaking Changes
- None. All changes are additive and backward-compatible.

## New Dependencies
- None added in this phase.

## Configuration Updates
- Router audit logging enabled by default
- KPI collection intervals: 30s (logs), 60s (metrics)
- Audit log retention: 90 days (configurable)

## Monitoring & Alerts
- **Guild KPI Violations**: Alerts when KPIs exceed thresholds
- **Router Escalation Events**: Notifications for fallback chain usage
- **Audit Log Errors**: Monitoring for logging failures
- **Performance Impact**: CPU/memory monitoring for observability overhead

## Guild-Specific Notes

### Forge Guild (Dregg Embercode)
- Build time KPIs now tracked automatically
- Performance budgets monitored via router audit logs
- Break-glass fixes logged with escalation triggers

### Crafters Guild (Vanta Lumin & Volt Furnace)
- CLS scores integrated with routing decisions
- UI accessibility metrics tracked
- Design system compliance monitored

### Keepers Guild (Sentenial Ledgerwarden)
- Security scan results logged to audit trail
- Compliance violations trigger alerts
- Secret access patterns monitored

### Huntress Guild (Magnolia Nightbloom & Mags Charietto)
- Test coverage metrics updated in real-time
- Flaky test detection via audit log analysis
- Regression alerts based on routing patterns

### Mages Guild (Hex Oracle, Grim Rune, Launcey Gauge)
- Quality gate failures logged with detailed context
- Routing matrix compliance enforced
- Forecasting accuracy tracked via KPI metrics

## Troubleshooting

### Router Audit Logging Not Working
1. Check backend endpoints are deployed
2. Verify `goblinos.overmind.router-audit` namespace exists
3. Check feature flag status

### KPI Metrics Not Updating
1. Validate guild-specific metric collection
2. Check backend `/v1/guild-kpi` endpoint
3. Verify KPI calculation logic

### Dashboard Performance Issues
1. Reduce refresh intervals if needed
2. Check for memory leaks in metric queries
3. Optimize audit log queries with pagination

## Future Considerations
- Consider adding ML-based anomaly detection for KPI trends
- Evaluate audit log analytics for routing optimization
- Plan for multi-region observability expansion

---

*Migration completed on: [Current Date]*
*Next Phase: Phase 7 - Advanced Analytics & Optimization*
