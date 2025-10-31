# Bug Fix Template

## Overview

This template provides a systematic approach to identifying, reproducing, fixing, and validating software bugs. It ensures thorough investigation, minimal regression risk, and proper documentation of fixes. Use this template for any bug reports, production issues, or unexpected behavior fixes.

## Prerequisites Checklist

- [ ] **Bug Report Quality**: Clear description, steps to reproduce, expected vs. actual behavior
- [ ] **Environment Access**: Access to affected environment (dev/staging/production)
- [ ] **Reproduction Steps**: Verified steps to consistently reproduce the issue
- [ ] **Impact Assessment**: Severity, affected users, business impact evaluated
- [ ] **Test Coverage**: Existing tests for affected functionality verified
- [ ] **Code Access**: Source code and version control access confirmed

## Bug Investigation

### Bug Report Details

**Bug ID:** [JIRA/Bugzilla/GitHub Issue ID]
**Title:** [Brief, descriptive title]
**Reported By:** [Name/Team] on [Date]
**Severity:** [Critical/High/Medium/Low]
**Priority:** [P0/P1/P2/P3]

### Initial Assessment

**Expected Behavior:**
[What should happen according to requirements/design]

**Actual Behavior:**
[What actually happens, including error messages, stack traces, screenshots]

**Environment Details:**

- **OS/Browser:** [Specific versions]
- **Device:** [Desktop/Mobile/Tablet]
- **Application Version:** [Commit hash, build number]
- **Database Version:** [If applicable]
- **Configuration:** [Relevant config settings]

### Reproduction Steps

1. [Step-by-step instructions to reproduce]
2. [Include specific data, user accounts, or states needed]
3. [Note any prerequisites or setup required]
4. [Specify expected result at each step]

**Reproducibility Rate:** [Always/Sometimes/Rarely/Never]
**Tested Environments:** [List all environments where issue was reproduced]

## Root Cause Analysis

### Investigation Findings

**Code Location:**

- **File:** `path/to/file.ext`
- **Function/Method:** `functionName()`
- **Line Number:** ____
- **Commit:** [Hash where bug was introduced]

**Root Cause:**
[Explain the underlying cause of the bug. What code/logic is incorrect?]

**Contributing Factors:**

- [List any factors that contributed to the bug]
- [Configuration issues, data problems, timing issues, etc.]

### Impact Analysis

**Affected Users:**

- **User Types:** [Customer/Admin/Internal users]
- **Volume:** [Number/percentage of affected users]
- **Frequency:** [How often users encounter this bug]

**Business Impact:**

- **Revenue Impact:** [Lost revenue, blocked transactions]
- **User Experience:** [Frustration, abandonment, support tickets]
- **Operational Impact:** [System downtime, manual workarounds]

**Data Impact:**

- **Data Corruption:** [Any data that may be incorrect/inconsistent]
- **Data Loss:** [Any permanent data loss]
- **Recovery Required:** [Steps needed to fix affected data]

## Fix Implementation

### Solution Design

**Fix Strategy:**

- [Direct fix, workaround, feature flag, configuration change]
- [Why this approach vs. alternatives]

**Code Changes Required:**

1. [File/Function 1]: [Description of changes]
2. [File/Function 2]: [Description of changes]
3. [Database Changes]: [Schema/data migrations if needed]

**Backward Compatibility:**

- [ ] Breaking change requiring migration
- [ ] Backward compatible fix
- [ ] Feature flag controlled rollout

### Implementation Steps

1. **Create Fix Branch:** `fix/[bug-id]-[brief-description]`
2. **Implement Fix:** Apply code changes with clear commit messages
3. **Add/Update Tests:** Ensure test coverage for the fix
4. **Update Documentation:** Modify docs if behavior changes
5. **Code Review:** Submit for peer review

### Rollback Plan

**Immediate Rollback (< 30 minutes):**

- Revert the fix commit
- Deploy previous version
- Monitor for original issue return

**Gradual Rollback (30-120 minutes):**

- Feature flag deactivation (if applicable)
- Incremental user impact reduction
- Alternative workaround deployment

## Testing & Validation

### Automated Testing

**Unit Tests:**

- [ ] Test the specific bug scenario
- [ ] Test edge cases around the fix
- [ ] Ensure no regression in related functionality
- [ ] Verify error handling improvements

**Integration Tests:**

- [ ] End-to-end workflow testing
- [ ] API contract validation
- [ ] Database interaction testing
- [ ] External service integration

**Regression Tests:**

- [ ] Existing test suite passes (100%)
- [ ] Performance benchmarks maintained
- [ ] Load testing under normal conditions

### Manual Testing

**Bug Fix Validation:**

- [ ] Original reproduction steps now work correctly
- [ ] Edge cases around the fix tested
- [ ] Cross-browser/device testing (if UI related)
- [ ] Accessibility testing (if applicable)

**Regression Testing:**

- [ ] Core user workflows tested
- [ ] Related features verified
- [ ] Performance impact assessed
- [ ] Error scenarios validated

### Environment Testing

**Development Environment:**

- [ ] Local reproduction confirmed fixed
- [ ] Unit tests pass
- [ ] Integration tests pass

**Staging Environment:**

- [ ] Full regression test suite passes
- [ ] Performance testing completed
- [ ] User acceptance testing passed

**Production Environment:**

- [ ] Gradual rollout plan prepared
- [ ] Monitoring and alerting configured
- [ ] Rollback procedures ready

## Deployment Strategy

### Risk Assessment

**Deployment Risk Level:** [Low/Medium/High/Critical]

**Risk Factors:**

- [ ] User-facing functionality
- [ ] Database schema changes
- [ ] External service dependencies
- [ ] High-traffic code paths
- [ ] Complex business logic

### Deployment Plan

#### Phase 1: Preparation (Pre-deployment)

- [ ] Code review completed and approved
- [ ] All tests passing in staging
- [ ] Deployment scripts validated
- [ ] Rollback procedures documented

#### Phase 2: Deployment

- [ ] Feature flag activation (if applicable)
- [ ] Gradual rollout (0% → 10% → 50% → 100%)
- [ ] Real-time monitoring active
- [ ] Support team notified

#### Phase 3: Validation

- [ ] Error rates monitored (< ____% increase)
- [ ] Performance metrics tracked
- [ ] User feedback collected
- [ ] Success metrics validated

## Monitoring & Alerting

### Key Metrics to Monitor

**Technical Metrics:**

- Error rates and types
- Response times and throughput
- Resource utilization
- Database performance

**Business Metrics:**

- User success rates
- Support ticket volume
- Feature usage statistics
- Customer satisfaction

### Alert Conditions

**Critical Alerts:**

- Error rate > ____% (vs. baseline)
- Response time > ____ ms (95th percentile)
- Service unavailable > ____ minutes
- Data inconsistency detected

**Warning Alerts:**

- Performance degradation > ____%
- Unusual error patterns
- Increased support ticket volume

## Communication Plan

### Internal Communication

**Development Team:**

- Daily progress updates during investigation
- Code review notifications
- Deployment status updates

**Stakeholders:**

- Initial impact assessment
- Fix timeline estimates
- Deployment notifications
- Post-fix validation results

### External Communication

**User Communication:**

- Status page updates (if service impact)
- User-facing notifications (if applicable)
- Documentation updates

**Support Team:**

- Known issue documentation
- Workaround procedures
- Fix deployment notifications
- Post-fix validation confirmation

## Success Criteria

### Technical Success

- [ ] Bug reproduction steps no longer work
- [ ] All automated tests pass
- [ ] Code review approved
- [ ] Performance benchmarks maintained
- [ ] No new bugs introduced

### Business Success

- [ ] User impact resolved
- [ ] Support ticket volume reduced
- [ ] Customer satisfaction improved
- [ ] Business metrics recovered

### Process Success

- [ ] Root cause documented
- [ ] Fix properly tested
- [ ] Knowledge shared with team
- [ ] Process improvements identified

## Post-Fix Activities

### Documentation Updates

- [ ] Bug report updated with resolution
- [ ] Code comments added explaining the fix
- [ ] Troubleshooting guides updated
- [ ] Known issues list updated

### Knowledge Sharing

- [ ] Team retrospective on bug investigation
- [ ] Lessons learned documented
- [ ] Prevention measures implemented
- [ ] Similar pattern detection automated

### Prevention Measures

- [ ] Additional test cases added
- [ ] Code quality checks enhanced
- [ ] Monitoring alerts improved
- [ ] Development practices updated

## Timeline & Milestones

| Phase | Duration | Key Activities | Success Criteria |
|-------|----------|----------------|------------------|
| Investigation | 1-4 hours | Root cause analysis, impact assessment | Root cause identified, impact understood |
| Fix Development | 2-8 hours | Code changes, testing, review | Fix implemented, tests pass |
| Validation | 4-12 hours | Comprehensive testing, staging validation | All tests pass, no regressions |
| Deployment | 1-4 hours | Production deployment, monitoring | Successful rollout, stable service |

## Emergency Contacts

**Technical Lead:** [Name] - [Contact]
**DevOps/SRE:** [Name] - [Contact]
**Product Owner:** [Name] - [Contact]
**Customer Support:** [Name] - [Contact]

---

**Template Version:** 1.0
**Last Updated:** October 27, 2025
**Applicable To:** Bug fixes, production issues, unexpected behavior resolution
