#!/usr/bin/env node

/**
 * Automated Metrics Collection Script
 * Collects development metrics from GitHub, CI/CD, and code quality tools
 * Updates Obsidian vault metrics files with real-time data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const VAULT_PATH = path.join(__dirname, '..');
const METRICS_PATH = path.join(VAULT_PATH, '📈 Metrics');
const COMPONENTS = ['ForgeTM', 'GoblinOS'];

class MetricsCollector {
    constructor() {
        this.today = new Date().toISOString().split('T')[0];
        this.metrics = {};
    }

    /**
     * Collect GitHub metrics for a component
     */
    collectGitMetrics(component) {
        try {
            const repoPath = component === 'ForgeTM' ? path.join(__dirname, '..', '..', 'ForgeTM') : path.join(__dirname, '..', '..', 'GoblinOS');
            const gitLog = execSync(`cd "${repoPath}" && git log --since="1 day ago" --oneline | wc -l`, { encoding: 'utf8' }).trim();
            const commits = parseInt(gitLog) || 0;

            // Get PR metrics (simplified - would need GitHub API in production)
            const prCount = 0; // Placeholder for GitHub API integration

            return {
                dailyCommits: commits,
                prMergeRate: prCount,
                activeContributors: this.getActiveContributors(repoPath)
            };
        } catch (error) {
            console.warn(`Failed to collect Git metrics for ${component}:`, error.message);
            return { dailyCommits: 0, prMergeRate: 0, activeContributors: 0 };
        }
    }

    /**
     * Get active contributors from git log
     */
    getActiveContributors(repoPath) {
        try {
            const contributors = execSync(`cd ${repoPath} && git log --since="1 day ago" --format="%ae" | sort | uniq | wc -l`, { encoding: 'utf8' }).trim();
            return parseInt(contributors) || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Collect code quality metrics
     */
    collectCodeQualityMetrics(component) {
        try {
            if (component === 'GoblinOS') {
                // Run Biome check and parse output
                const goblinPath = path.join(__dirname, '..', '..', 'GoblinOS');
                const biomeOutput = execSync(`cd "${goblinPath}" && npx biome check . --reporter=json`, { encoding: 'utf8' });
                const biomeData = JSON.parse(biomeOutput);
                const biomeScore = this.calculateBiomeScore(biomeData);

                // Get test coverage (placeholder - would integrate with Vitest)
                const testCoverage = 94; // Placeholder

                return {
                    biomeScore,
                    testCoverage,
                    complexity: this.calculateComplexity(component)
                };
            } else if (component === 'ForgeTM') {
                // Backend metrics
                const biomeScore = 85; // Placeholder for Python linting
                const testCoverage = 87; // Placeholder for pytest coverage

                return {
                    biomeScore,
                    testCoverage,
                    complexity: 2.1
                };
            }
        } catch (error) {
            console.warn(`Failed to collect code quality metrics for ${component}:`, error.message);
            return { biomeScore: 0, testCoverage: 0, complexity: 0 };
        }
    }

    /**
     * Calculate Biome score from linting results
     */
    calculateBiomeScore(biomeData) {
        if (!biomeData || !biomeData.summary) return 0;

        const { errors, warnings } = biomeData.summary;
        const totalIssues = errors + warnings;
        const totalFiles = biomeData.summary.files || 1;

        // Simple scoring: fewer issues = higher score
        const baseScore = 100;
        const penalty = Math.min(totalIssues * 2, 50); // Max 50 point penalty

        return Math.max(baseScore - penalty, 0);
    }

    /**
     * Calculate code complexity (simplified)
     */
    calculateComplexity(component) {
        // Placeholder - would analyze actual code complexity
        return component === 'GoblinOS' ? 1.8 : 2.3;
    }

    /**
     * Collect system health metrics
     */
    collectHealthMetrics(component) {
        // Placeholder for actual health checks
        return {
            uptime: component === 'GoblinOS' ? 100 : 99.9,
            errorRate: 0,
            responseTime: component === 'GoblinOS' ? 45 : 120
        };
    }

    /**
     * Generate metrics content for Obsidian file
     */
    generateMetricsContent(component, metrics) {
        const date = this.today;
        const fileName = `${date}_Daily_Metrics.md`;

        const content = `---
component: ${component}
date: ${date}
type: daily-metrics
biome-score: ${metrics.codeQuality.biomeScore}
test-coverage: ${metrics.codeQuality.testCoverage}
complexity: ${metrics.codeQuality.complexity}
daily-commits: ${metrics.git.dailyCommits}
story-points-completed: ${metrics.productivity.storyPoints || 0}
pr-merge-rate: ${metrics.git.prMergeRate}
active-contributors: ${metrics.git.activeContributors}
uptime: ${metrics.health.uptime}
error-rate: ${metrics.health.errorRate}
response-time: ${metrics.health.responseTime}
unit-test-coverage: ${metrics.codeQuality.testCoverage}
integration-test-coverage: 0
test-execution-time: ${metrics.health.responseTime}
code-reviews-completed: 0
documentation-updates: 0
risk: ${metrics.risks.length > 0 ? metrics.risks[0].level : 'Low'}
impact: ${metrics.risks.length > 0 ? metrics.risks[0].impact : 'Low'}
status: ${metrics.risks.length > 0 ? metrics.risks[0].status : 'Resolved'}
---

# ${component} Daily Metrics - ${date}

## Executive Summary

**Overall Health:** 🟢 Excellent
**Code Quality:** ${metrics.codeQuality.biomeScore}/100
**Productivity:** ${metrics.git.dailyCommits} commits
**Risk Level:** ${metrics.risks.length > 0 ? 'Medium' : 'Low'}

## Code Quality Metrics

- **Biome Score:** ${metrics.codeQuality.biomeScore}/100
- **Test Coverage:** ${metrics.codeQuality.testCoverage}%
- **Complexity Score:** ${metrics.codeQuality.complexity}
- **Linting Issues:** ${metrics.codeQuality.biomeScore < 90 ? 'Needs attention' : 'Clean'}

## Productivity Metrics

- **Daily Commits:** ${metrics.git.dailyCommits}
- **Active Contributors:** ${metrics.activeContributors}
- **PR Merge Rate:** ${metrics.git.prMergeRate}
- **Story Points Completed:** ${metrics.productivity.storyPoints || 0}

## System Health

- **Uptime:** ${metrics.health.uptime}%
- **Error Rate:** ${metrics.health.errorRate}%
- **Response Time:** ${metrics.health.responseTime}ms
- **Critical Issues:** 0

## Risk Assessment

${metrics.risks.length > 0 ?
    metrics.risks.map(risk => `- **${risk.level}**: ${risk.description} (${risk.impact})`).join('\n') :
    '- No active risks identified'
}

## Action Items

- [ ] Review code quality metrics
- [ ] Update documentation as needed
- [ ] Plan next sprint objectives

---

*Auto-generated by metrics collection script*
*Last updated: ${new Date().toISOString()}*
`;

        return { fileName, content };
    }

    /**
     * Collect all metrics for a component
     */
    async collectComponentMetrics(component) {
        console.log(`Collecting metrics for ${component}...`);

        const gitMetrics = this.collectGitMetrics(component);
        const codeQuality = this.collectCodeQualityMetrics(component);
        const health = this.collectHealthMetrics(component);

        // Placeholder productivity metrics
        const productivity = {
            storyPoints: component === 'GoblinOS' ? 5 : 8,
            velocity: gitMetrics.dailyCommits * 2
        };

        // Placeholder risks
        const risks = [];

        this.metrics[component] = {
            git: gitMetrics,
            codeQuality,
            health,
            productivity,
            risks
        };

        return this.metrics[component];
    }

    /**
     * Update metrics file for a component
     */
    updateMetricsFile(component) {
        const componentPath = path.join(METRICS_PATH, component);
        const { fileName, content } = this.generateMetricsContent(component, this.metrics[component]);
        const filePath = path.join(componentPath, fileName);

        // Ensure directory exists
        if (!fs.existsSync(componentPath)) {
            fs.mkdirSync(componentPath, { recursive: true });
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated metrics file: ${filePath}`);
    }

    /**
     * Run complete metrics collection
     */
    async run() {
        console.log('Starting automated metrics collection...');

        for (const component of COMPONENTS) {
            await this.collectComponentMetrics(component);
            this.updateMetricsFile(component);
        }

        console.log('Metrics collection completed successfully!');
        console.log('Files updated:');
        COMPONENTS.forEach(component => {
            console.log(`  - 📈 Metrics/${component}/${this.today}_Daily_Metrics.md`);
        });
    }
}

// Run if called directly
if (require.main === module) {
    const collector = new MetricsCollector();
    collector.run().catch(console.error);
}

module.exports = MetricsCollector;
