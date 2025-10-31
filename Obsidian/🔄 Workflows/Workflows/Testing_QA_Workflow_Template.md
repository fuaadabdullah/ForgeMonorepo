---
component: "{{component}}"
type: "workflow"
phase: "testing"
status: "active"
created: "{{date}}"
updated: "{{date}}"
owner: "{{owner}}"
tags: ["testing", "qa", "quality-assurance", "automation"]
---

# Testing & QA Workflow Template

## Overview

**Feature/Task**: {{feature_name}}

**Test Type**: {{test_type}} (Unit | Integration | E2E | Performance | Security)

**Priority**: {{priority}} (Critical | High | Medium | Low)

**Deadline**: {{deadline}}

**Test Lead**: {{test_lead}}

**Team**: {{component}}

## Test Planning

### Scope & Objectives

**What we're testing**:

- {{test_objective_1}}
- {{test_objective_2}}
- {{test_objective_3}}

**What's NOT in scope**:

- {{out_of_scope_1}}
- {{out_of_scope_2}}

### Test Strategy

**Testing Approach**:

- [ ] Manual testing only
- [ ] Automated testing only
- [ ] Manual + Automated (Hybrid)
- [ ] Exploratory testing focus

**Test Environments**:

- [ ] Local development
- [ ] Staging environment
- [ ] Production-like environment
- [ ] Performance testing environment

### Test Cases

#### Functional Test Cases

| Test Case ID | Description | Preconditions | Steps | Expected Result | Priority | Status |
|--------------|-------------|---------------|-------|-----------------|----------|--------|
| TC-{{component}}-001 | {{test_description}} | {{preconditions}} | {{steps}} | {{expected_result}} | {{priority}} | {{status}} |
| TC-{{component}}-002 | {{test_description}} | {{preconditions}} | {{steps}} | {{expected_result}} | {{priority}} | {{status}} |

#### Edge Cases & Error Scenarios

| Scenario | Input | Expected Behavior | Actual Result | Status |
|----------|-------|-------------------|---------------|--------|
| {{edge_case_1}} | {{input}} | {{expected}} | {{actual}} | {{status}} |
| {{edge_case_2}} | {{input}} | {{expected}} | {{actual}} | {{status}} |

#### Performance Test Cases

| Test Case | Load | Response Time Target | Throughput Target | Status |
|-----------|------|---------------------|-------------------|--------|
| {{perf_test_1}} | {{load}} | {{response_time}} | {{throughput}} | {{status}} |
| {{perf_test_2}} | {{load}} | {{response_time}} | {{throughput}} | {{status}} |

## Test Execution

### Pre-Execution Checklist

- [ ] Test environment prepared and stable
- [ ] Test data created and validated
- [ ] Test scripts/tools ready
- [ ] Access permissions configured
- [ ] Monitoring tools set up
- [ ] Rollback procedures documented

### Test Execution Log

#### Session 1: {{date}} - {{tester}}

**Environment**: {{environment}}

**Test Cases Executed**: {{test_cases}}

**Results Summary**:

- Passed: {{passed_count}}
- Failed: {{failed_count}}
- Blocked: {{blocked_count}}
- Not Executed: {{not_executed_count}}

**Issues Found**:

| Issue ID | Test Case | Severity | Description | Steps to Reproduce | Evidence |
|----------|-----------|----------|-------------|-------------------|----------|
| BUG-{{component}}-001 | TC-{{component}}-001 | {{severity}} | {{description}} | {{steps}} | {{evidence_link}} |
| BUG-{{component}}-002 | TC-{{component}}-002 | {{severity}} | {{description}} | {{steps}} | {{evidence_link}} |

**Session Notes**: {{session_notes}}

#### Session 2: {{date}} - {{tester}}

**Environment**: {{environment}}

**Test Cases Executed**: {{test_cases}}

**Results Summary**:

- Passed: {{passed_count}}
- Failed: {{failed_count}}
- Blocked: {{blocked_count}}
- Not Executed: {{not_executed_count}}

**Issues Found**:

| Issue ID | Test Case | Severity | Description | Steps to Reproduce | Evidence |
|----------|-----------|----------|-------------|-------------------|----------|
| BUG-{{component}}-003 | TC-{{component}}-003 | {{severity}} | {{description}} | {{steps}} | {{evidence_link}} |

**Session Notes**: {{session_notes}}

## Automated Testing

### Unit Tests

**Framework**: {{unit_test_framework}} (Vitest | pytest | Jest)

**Coverage Target**: {{coverage_target}}%

**Coverage Results**:

- Statements: {{statement_coverage}}%
- Branches: {{branch_coverage}}%
- Functions: {{function_coverage}}%
- Lines: {{line_coverage}}%

**Test Files**: {{test_files}}

**CI/CD Status**: {{ci_status}}

### Integration Tests

**Framework**: {{integration_framework}}

**Test Scenarios**: {{integration_scenarios}}

**API Endpoints Tested**: {{api_endpoints}}

**Database State**: {{database_state}}

**External Dependencies**: {{external_deps}}

### End-to-End Tests

**Framework**: {{e2e_framework}} (Playwright | Cypress | Selenium)

**Browser Coverage**: {{browsers}}

**Test Scenarios**: {{e2e_scenarios}}

**Performance Benchmarks**: {{benchmarks}}

### Performance Tests

**Tool**: {{performance_tool}} (k6 | JMeter | Artillery)

**Load Profile**:

- Concurrent Users: {{concurrent_users}}
- Ramp-up Time: {{ramp_up_time}}
- Test Duration: {{test_duration}}

**Performance Results**:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Response Time (95th percentile) | {{target_response_time}} | {{actual_response_time}} | {{status}} |
| Throughput (requests/second) | {{target_throughput}} | {{actual_throughput}} | {{status}} |
| Error Rate | {{target_error_rate}} | {{actual_error_rate}} | {{status}} |
| Memory Usage | {{target_memory}} | {{actual_memory}} | {{status}} |

## Security Testing

### Security Test Checklist

- [ ] Input validation testing (SQL injection, XSS, CSRF)
- [ ] Authentication and authorization testing
- [ ] Session management testing
- [ ] Data encryption testing
- [ ] API security testing (rate limiting, CORS)
- [ ] Dependency vulnerability scanning
- [ ] Secrets management validation

### Security Findings

| Finding | Severity | Description | Impact | Mitigation | Status |
|---------|----------|-------------|--------|------------|--------|
| {{finding_1}} | {{severity}} | {{description}} | {{impact}} | {{mitigation}} | {{status}} |
| {{finding_2}} | {{severity}} | {{description}} | {{impact}} | {{mitigation}} | {{status}} |

## Accessibility Testing

### WCAG Compliance Checklist

- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Color contrast meets standards
- [ ] Focus indicators visible
- [ ] Alt text provided for images
- [ ] Semantic HTML used
- [ ] Form labels associated

### Accessibility Issues

| Issue | WCAG Guideline | Impact | Description | Fix Applied | Status |
|-------|----------------|--------|-------------|-------------|--------|
| {{issue_1}} | {{guideline}} | {{impact}} | {{description}} | {{fix}} | {{status}} |
| {{issue_2}} | {{guideline}} | {{impact}} | {{description}} | {{fix}} | {{status}} |

## Cross-Browser Testing

### Browser Matrix

| Browser | Version | OS | Status | Notes |
|---------|---------|----|--------|-------|
| Chrome | {{chrome_version}} | macOS | {{status}} | {{notes}} |
| Firefox | {{firefox_version}} | macOS | {{status}} | {{notes}} |
| Safari | {{safari_version}} | macOS | {{status}} | {{notes}} |
| Edge | {{edge_version}} | Windows | {{status}} | {{notes}} |

## Mobile Testing

### Device Coverage

| Device | OS Version | Screen Size | Status | Notes |
|--------|------------|-------------|--------|-------|
| iPhone 12 | iOS {{ios_version}} | 390x844 | {{status}} | {{notes}} |
| iPad Pro | iPadOS {{ipados_version}} | 1024x1366 | {{status}} | {{notes}} |
| Samsung Galaxy S21 | Android {{android_version}} | 360x800 | {{status}} | {{notes}} |

## Test Data Management

### Test Data Sets

| Data Set | Purpose | Location | Refresh Frequency | Status |
|----------|---------|----------|-------------------|--------|
| {{dataset_1}} | {{purpose}} | {{location}} | {{frequency}} | {{status}} |
| {{dataset_2}} | {{purpose}} | {{location}} | {{frequency}} | {{status}} |

### Data Cleanup Procedures

- [ ] Test user accounts removed
- [ ] Test data purged from databases
- [ ] Test files cleaned up
- [ ] Cache cleared
- [ ] Sessions terminated

## Bug Tracking & Reporting

### Bug Classification

**Severity Levels**:

- **Critical**: System crash, data loss, security breach
- **High**: Major functionality broken, no workaround
- **Medium**: Functionality impaired, workaround exists
- **Low**: Minor issue, cosmetic problems

**Priority Levels**:

- **P1**: Fix immediately (blocks release)
- **P2**: Fix soon (affects user experience)
- **P3**: Fix when possible (nice to have)
- **P4**: Fix in future release (minor)

### Bug Report Template

**Bug ID**: BUG-{{component}}-{{number}}

**Title**: {{bug_title}}

**Severity**: {{severity}}

**Priority**: {{priority}}

**Environment**: {{environment}}

**Steps to Reproduce**:

1. {{step_1}}
2. {{step_2}}
3. {{step_3}}

**Expected Result**: {{expected_result}}

**Actual Result**: {{actual_result}}

**Evidence**: {{screenshots_logs}}

**Workaround**: {{workaround}}

**Root Cause**: {{root_cause}}

**Fix Applied**: {{fix_description}}

## Test Completion & Sign-off

### Test Summary

**Overall Test Status**: {{overall_status}}

**Test Coverage Achieved**: {{coverage_percentage}}%

**Bugs Found**: {{total_bugs}}

**Bugs Fixed**: {{bugs_fixed}}

**Bugs Outstanding**: {{bugs_outstanding}}

**Risk Assessment**: {{risk_assessment}}

### Quality Gates

- [ ] All critical test cases passed
- [ ] No critical or high-severity bugs open
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Accessibility standards met
- [ ] Cross-browser compatibility verified

### Sign-off Approvals

- [ ] **QA Lead**: {{qa_lead}} - {{qa_status}}
- [ ] **Development Lead**: {{dev_lead}} - {{dev_status}}
- [ ] **Product Owner**: {{product_owner}} - {{product_status}}
- [ ] **Security Officer**: {{security_officer}} - {{security_status}}

**Final Recommendation**: {{recommendation}}

## Test Metrics & Analytics

### Test Effectiveness Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Test Case Coverage | {{target_coverage}}% | {{actual_coverage}}% | {{status}} |
| Defect Detection Rate | {{target_detection}}% | {{actual_detection}}% | {{status}} |
| Test Execution Time | {{target_time}} | {{actual_time}} | {{status}} |
| Automation Coverage | {{target_automation}}% | {{actual_automation}}% | {{status}} |

### Test Process Metrics

| Metric | Value | Trend |
|--------|-------|-------|
| Tests per Developer Day | {{tests_per_day}} | {{trend}} |
| Bug Fix Time (Average) | {{avg_fix_time}} | {{trend}} |
| Test Environment Uptime | {{uptime_percentage}}% | {{trend}} |
| False Positive Rate | {{false_positive_rate}}% | {{trend}} |

## Lessons Learned & Improvements

### What Went Well

- {{positive_1}}
- {{positive_2}}
- {{positive_3}}

### Areas for Improvement

- {{improvement_1}}
- {{improvement_2}}
- {{improvement_3}}

### Process Recommendations

1. {{recommendation_1}}
2. {{recommendation_2}}
3. {{recommendation_3}}

## Related Documentation

- **Requirements**: [[{{requirements_link}}]]
- **Test Plans**: [[{{test_plan_link}}]]
- **Bug Reports**: [[{{bug_reports_link}}]]
- **User Stories**: [[{{user_stories_link}}]]

---

## Testing Guidelines

### For Test Execution

1. **Document Everything**: Record all steps, results, and observations
2. **Report Issues Immediately**: Don't wait for test completion to report bugs
3. **Verify Fixes**: Always retest after bug fixes
4. **Maintain Test Data**: Keep test environments clean and consistent
5. **Collaborate**: Work closely with developers and product owners

### For Test Automation

1. **Start Simple**: Automate stable, high-value test cases first
2. **Maintainability**: Write clean, readable automated tests
3. **Data Independence**: Use test data that doesn't conflict
4. **CI/CD Integration**: Ensure automated tests run in pipeline
5. **Regular Updates**: Keep automated tests current with application changes

### Quality Standards

- **Test Coverage**: Minimum 80% for critical paths
- **Bug Leakage**: Zero critical bugs in production
- **Test Execution**: 100% planned tests executed
- **Documentation**: All test cases and results documented
- **Traceability**: All requirements linked to test cases

*This template ensures comprehensive, systematic testing across all {{component}} features.*
