# Agent Planning Template

## Overview

This template provides a structured approach for AI agents to plan and communicate their problem-solving process. Use this template when tackling complex issues, refactoring code, or implementing new features. The use of this template is optional - agents may adapt it as needed or create their own planning approach.

## Template Structure

### 1. Acknowledgment

[Start with a brief acknowledgment of the task or issue at hand]

"Of course. I will [describe the action] to [achieve goal]."

### 2. Plan Overview

[Provide a high-level summary of your approach]

"My plan is to [high-level strategy]. This [solution/component] will:

- **[Key Action 1]**: [Detailed description of what will be done and why]
- **[Key Action 2]**: [Detailed description of what will be done and why]
- **[Key Action 3]**: [Detailed description of what will be done and why]
- **[Key Action 4]**: [Detailed description of what will be done and why]

This will create [expected benefits and improvements]."

### 3. Implementation Steps

[Break down the plan into actionable steps]

1. **[Step 1]**: [Specific action to take]
2. **[Step 2]**: [Specific action to take]
3. **[Step 3]**: [Specific action to take]
4. **[Step 4]**: [Specific action to take]

### 4. Validation and Testing

[Describe how you'll verify the solution works]

- [ ] **[Validation Criteria 1]**: [How to check this]
- [ ] **[Validation Criteria 2]**: [How to check this]
- [ ] **[Validation Criteria 3]**: [How to check this]

### 5. Next Steps

[Conclude with immediate actions]

"I will now [begin implementation/apply the changes]."

## Example Usage

### Example: Workflow Refactoring

**Acknowledgment:**
"Of course. I will refactor the workflow to remove the duplication."

**Plan Overview:**
"My plan is to merge the two jobs, validate-vault and nightly-validation, into a single, more efficient job. This new job will:

- **Consolidate Setup**: Perform the checkout and Node.js setup once.
- **Consolidate Dependency Installation**: Install all npm packages in a single step.
- **Use the Best Script**: Use the more thorough 'Comprehensive vault health check' script for all validation runs (on push, PR, and schedule).
- **Conditional Notifications**: Keep the Slack notification, but configure it to run only on the nightly scheduled run.

This will create a much cleaner, easier-to-maintain workflow that follows the 'Don't Repeat Yourself' (DRY) principle."

**Implementation Steps:**

1. Merge the two job definitions in the workflow YAML
2. Update the dependency installation to run once
3. Configure conditional logic for notifications
4. Test the workflow on a feature branch

**Validation and Testing:**

- [ ] Workflow runs successfully on push
- [ ] Workflow runs successfully on PR
- [ ] Scheduled run includes notification
- [ ] No duplicate steps in logs

**Next Steps:**
"I will now apply this refactoring."

## Notes for Agents

- **Adaptability**: Feel free to modify this template to fit your specific needs or problem domain
- **Optional Use**: This template is provided as a helpful framework, not a requirement
- **Documentation**: Update relevant documentation after implementing changes
- **Testing**: Always include validation steps to ensure changes work as expected
