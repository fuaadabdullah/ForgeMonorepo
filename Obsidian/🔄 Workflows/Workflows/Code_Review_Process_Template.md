---
title: "Code Review Process Template"
type: "workflow"
project: "{{project}}"
component: "{{component}}"
status: "in-review"
priority: "high"
assignee: "{{reviewer}}"
created: "{{date}}"
updated: "{{date}}"
pr_number: "{{pr_number}}"
branch: "{{branch}}"
---

# Code Review Process: PR #{{pr_number}}

## Overview

**Pull Request**: [#{{pr_number}}]({{pr_url}}) - {{pr_title}}

**Author**: {{author}}

**Reviewers**: {{reviewers}}

**Branch**: {{branch}} → {{target_branch}}

**Changes**: {{changes_summary}}

**Testing**: {{testing_status}}

## Pre-Review Checklist (Author)

### Code Quality

- [ ] Code follows established patterns and conventions
- [ ] No hardcoded secrets or credentials
- [ ] Error handling is appropriate and comprehensive
- [ ] Code is well-documented with comments
- [ ] Naming conventions are consistent
- [ ] No unused imports or variables

### Testing

- [ ] Unit tests added/updated for new functionality
- [ ] Integration tests added for API changes
- [ ] E2E tests added for user-facing features
- [ ] All tests pass locally
- [ ] Test coverage maintained (>80%)
- [ ] Edge cases and error scenarios covered

### Documentation

- [ ] README updated if needed
- [ ] API documentation updated for endpoint changes
- [ ] Migration guides added for breaking changes
- [ ] Changelog updated
- [ ] Code comments added for complex logic

### Security & Performance

- [ ] Security scan passes (`ggshield` or equivalent)
- [ ] No performance regressions introduced
- [ ] Database queries are optimized
- [ ] Memory leaks addressed
- [ ] Input validation implemented

## Review Checklist (Reviewer)

### Functional Review

- [ ] Code changes meet requirements
- [ ] Business logic is correct
- [ ] Edge cases handled appropriately
- [ ] Error scenarios covered
- [ ] User experience considerations addressed

### Code Quality Review

- [ ] Code is readable and maintainable
- [ ] Follows SOLID principles
- [ ] No code duplication introduced
- [ ] Appropriate abstractions used
- [ ] Complexity is manageable

### Testing Review

- [ ] Test coverage is adequate
- [ ] Tests are meaningful and not just coverage
- [ ] Test names are descriptive
- [ ] Mock usage is appropriate
- [ ] Integration tests verify real behavior

### Security Review

- [ ] Input validation is secure
- [ ] Authentication/authorization handled correctly
- [ ] Sensitive data handling is secure
- [ ] No security vulnerabilities introduced
- [ ] Dependencies are up-to-date and secure

### Performance Review

- [ ] No performance bottlenecks introduced
- [ ] Database queries are efficient
- [ ] Memory usage is reasonable
- [ ] Caching implemented where appropriate
- [ ] Scalability considerations addressed

## Review Feedback

### Major Issues (Blockers)

| Issue | Severity | Location | Description | Suggested Fix |
|-------|----------|----------|-------------|---------------|
| {{issue_1}} | {{severity}} | {{location}} | {{description}} | {{fix}} |
| {{issue_2}} | {{severity}} | {{location}} | {{description}} | {{fix}} |

### Minor Issues (Should Fix)

| Issue | Location | Description | Suggested Fix |
|-------|----------|-------------|---------------|
| {{issue_1}} | {{location}} | {{description}} | {{fix}} |
| {{issue_2}} | {{location}} | {{description}} | {{fix}} |

### Suggestions (Nice to Have)

| Suggestion | Location | Description | Rationale |
|------------|----------|-------------|-----------|
| {{suggestion_1}} | {{location}} | {{description}} | {{rationale}} |
| {{suggestion_2}} | {{location}} | {{description}} | {{rationale}} |

### Questions & Clarifications

| Question | Context | Answer |
|----------|---------|--------|
| {{question_1}} | {{context}} | {{answer}} |
| {{question_2}} | {{context}} | {{answer}} |

## Testing Results

### Automated Tests

- **Unit Tests**: {{unit_test_results}} ({{unit_test_coverage}}% coverage)
- **Integration Tests**: {{integration_test_results}}
- **E2E Tests**: {{e2e_test_results}}
- **Performance Tests**: {{performance_test_results}}

### Manual Testing

- [ ] Happy path scenarios tested
- [ ] Error scenarios tested
- [ ] Edge cases tested
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified

## Deployment Considerations

### Environment Impact

- [ ] Database migrations required
- [ ] Configuration changes needed
- [ ] External service dependencies
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

### Rollback Plan

**Steps to rollback**:

1. {{rollback_step_1}}
2. {{rollback_step_2}}
3. {{rollback_step_3}}

**Data migration rollback**: {{data_rollback_notes}}

## Approval & Sign-off

### Reviewer Approvals

- [ ] **Architecture Review**: {{architect_reviewer}} - {{architect_status}}
- [ ] **Security Review**: {{security_reviewer}} - {{security_status}}
- [ ] **QA Review**: {{qa_reviewer}} - {{qa_status}}
- [ ] **Product Review**: {{product_reviewer}} - {{product_status}}

### Final Decision

- [ ] **Approved** - Ready for merge
- [ ] **Approved with Conditions** - Address minor issues before merge
- [ ] **Changes Requested** - Major issues must be addressed
- [ ] **Rejected** - Does not meet requirements

**Final Comments**: {{final_comments}}

## Post-Merge Actions

### Monitoring (First 24 hours)

- [ ] Error rates monitored
- [ ] Performance metrics tracked
- [ ] User feedback collected
- [ ] Rollback readiness maintained

### Follow-up Tasks

- [ ] Documentation updates completed
- [ ] User communication sent
- [ ] Metrics baseline established
- [ ] Retrospective scheduled

## Review Timeline

| Event | Date/Time | Person | Notes |
|-------|-----------|--------|-------|
| PR Created | {{pr_created_date}} | {{author}} | {{pr_notes}} |
| Initial Review | {{initial_review_date}} | {{reviewer}} | {{review_notes}} |
| Changes Made | {{changes_date}} | {{author}} | {{changes_notes}} |
| Final Review | {{final_review_date}} | {{reviewer}} | {{final_notes}} |
| Merged | {{merge_date}} | {{merger}} | {{merge_notes}} |

## Related Documentation

- **Requirements**: [[{{requirements_link}}]]
- **Design Document**: [[{{design_link}}]]
- **API Documentation**: [[{{api_link}}]]
- **Testing Guide**: [[{{testing_link}}]]

---

## Code Review Guidelines

### For Authors

1. **Prepare Thoroughly**: Ensure all tests pass and documentation is updated
2. **Provide Context**: Include clear descriptions and link to requirements
3. **Be Responsive**: Address feedback promptly and explain decisions
4. **Test Carefully**: Verify changes work in staging environment

### For Reviewers

1. **Review Timely**: Complete reviews within 24 hours when possible
2. **Be Constructive**: Focus on code quality and learning opportunities
3. **Explain Rationale**: Provide context for requested changes
4. **Balance Thoroughness**: Don't let perfect be the enemy of good

### Review Process

1. **Automated Checks**: CI/CD must pass all gates
2. **Self-Review**: Author reviews their own code first
3. **Peer Review**: At least one peer reviewer required
4. **Specialist Review**: Security/architecture reviews as needed
5. **Approval**: All reviewers must approve before merge

*This template ensures consistent, high-quality code reviews across the {{component}} team.*

