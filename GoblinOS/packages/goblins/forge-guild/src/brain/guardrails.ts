import { z } from 'zod'
import type { Logger } from '../types.js'

// Security patterns to detect potentially harmful content
const SECURITY_PATTERNS = [
  // API keys and secrets (more comprehensive)
  /\b(sk|pk|token|key|secret|password|credential)s?\s*[=:]\s*['"]?\w+['"]?/gi,
  /\b[A-Za-z0-9_-]{16,}\b/g, // Long alphanumeric strings with dashes/underscores (potential keys)
  /\bsk-\w{48}\b/g, // OpenAI-style API keys
  /\bAIza[0-9A-Za-z_-]{35}\b/g, // Google API keys

  // System commands
  /\b(rm|del|format|shutdown|reboot|kill|sudo)\s+/gi,
  /\bexec\(|eval\(|system\(|shell_exec\(/gi,

  // File system access
  /\.\.[\/\\]/g, // Directory traversal
  /\/etc\/passwd|\/etc\/shadow|\.bash_history/gi,

  // Network attacks
  /\b(sql\s+injection|cross.?site|xxs|xss|csrf)\b/gi,
  /<script[^>]*>.*?<\/script>/gi,

  // Malicious imports
  /\bimport\s+os\b|\bimport\s+subprocess\b|\bimport\s+sys\b/gi,
  /\brequire\s*\(\s*['"]child_process['"]\s*\)/gi,
]

// Content policies
const CONTENT_POLICIES = {
  maxFileSize: 1024 * 1024, // 1MB per file
  maxFiles: 20, // Maximum files in a single scaffold
  allowedExtensions: [
    '.ts',
    '.js',
    '.tsx',
    '.jsx',
    '.json',
    '.md',
    '.txt',
    '.yml',
    '.yaml',
    '.py',
    '.sh',
    '.dockerfile',
    '.gitignore',
    '.env.example',
  ],
  blockedExtensions: ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif'],
  blockedPaths: ['/etc/', '/usr/', '/var/', '/root/', '/home/', 'C:\\Windows\\'],
}

// Guardrail configuration
export const GuardrailConfigSchema = z.object({
  enableSecurityScan: z.boolean().default(true),
  enableContentFilter: z.boolean().default(true),
  enableComplexityCheck: z.boolean().default(true),
  maxComplexityScore: z.number().min(1).max(10).default(7),
  allowedDomains: z.array(z.string()).default(['localhost', '127.0.0.1']),
  blockedKeywords: z
    .array(z.string())
    .default([
      'hack',
      'exploit',
      'malware',
      'virus',
      'trojan',
      'ransomware',
      'backdoor',
      'rootkit',
      'keylogger',
      'spyware',
    ]),
})

export type GuardrailConfig = z.infer<typeof GuardrailConfigSchema>

// Validation result
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(
    z.object({
      type: z.enum(['security', 'content', 'complexity', 'policy']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      message: z.string(),
      location: z.string().optional(),
    })
  ),
  recommendations: z.array(z.string()),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>

// Guardrail error
export class GuardrailError extends Error {
  constructor(
    message: string,
    public readonly violations: ValidationResult['issues']
  ) {
    super(message)
    this.name = 'GuardrailError'
  }
}

// Main guardrails class
export class SmithyGuardrails {
  private config: GuardrailConfig
  private logger: Logger

  constructor(logger: Logger, config: Partial<GuardrailConfig> = {}) {
    this.config = GuardrailConfigSchema.parse(config)
    this.logger = logger
  }

  /**
   * Validate a brain request before processing
   */
  async validateRequest(request: {
    task: string
    context?: Record<string, unknown>
    constraints?: Record<string, unknown>
  }): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    let score = 10 // Start with perfect score

    // Security scan
    if (this.config.enableSecurityScan) {
      const securityIssues = this.scanForSecurityIssues(request)
      issues.push(...securityIssues)
      score -= securityIssues.length * 2
    }

    // Content filter
    if (this.config.enableContentFilter) {
      const contentIssues = this.filterContent(request)
      issues.push(...contentIssues)
      score -= contentIssues.length * 1.5
    }

    // Complexity check
    if (this.config.enableComplexityCheck) {
      const complexityIssues = this.checkComplexity(request)
      issues.push(...complexityIssues)
      score -= complexityIssues.length * 1
    }

    // Policy check
    const policyIssues = this.checkPolicies(request)
    issues.push(...policyIssues)
    score -= policyIssues.length * 3

    // Clamp score
    score = Math.max(0, Math.min(10, score))

    const valid = issues.filter((i) => i.severity === 'critical').length === 0

    const result: ValidationResult = {
      valid,
      score,
      issues,
      recommendations: this.generateRecommendations(issues),
    }

    this.logger.info('Request validation completed', {
      valid: result.valid,
      score: result.score,
      issuesCount: issues.length,
    })

    return result
  }

  /**
   * Validate a brain response before returning to user
   */
  async validateResponse(response: {
    plan: {
      steps: Array<{
        action: string
        target: string
        content?: string
      }>
    }
  }): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    let score = 10

    // Validate file operations
    const fileIssues = this.validateFileOperations(response.plan.steps)
    issues.push(...fileIssues)
    score -= fileIssues.length * 2

    // Validate content safety
    const contentIssues = this.validateGeneratedContent(response.plan.steps)
    issues.push(...contentIssues)
    score -= contentIssues.length * 3

    // Check resource limits
    const resourceIssues = this.checkResourceLimits(response.plan.steps)
    issues.push(...resourceIssues)
    score -= resourceIssues.length * 1

    score = Math.max(0, Math.min(10, score))

    const valid = issues.filter((i) => i.severity === 'critical').length === 0

    const result: ValidationResult = {
      valid,
      score,
      issues,
      recommendations: this.generateRecommendations(issues),
    }

    this.logger.info('Response validation completed', {
      valid: result.valid,
      score: result.score,
      issuesCount: issues.length,
    })

    return result
  }

  /**
   * Sanitize content to remove potentially harmful elements
   */
  sanitizeContent(content: string): string {
    let sanitized = content

    // Remove potentially dangerous patterns
    SECURITY_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    })

    // Remove suspicious URLs
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, (match) => {
      try {
        const url = new URL(match)
        if (!this.config.allowedDomains.includes(url.hostname)) {
          return '[EXTERNAL_URL_REDACTED]'
        }
        return match
      } catch {
        return '[INVALID_URL_REDACTED]'
      }
    })

    return sanitized
  }

  /**
   * Scan for security issues in the request
   */
  private scanForSecurityIssues(request: Record<string, unknown>): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = []
    const content = JSON.stringify(request)

    SECURITY_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern)
      if (matches) {
        issues.push({
          type: 'security',
          severity: 'high',
          message: `Potential security issue detected (pattern ${index + 1})`,
          location: 'request',
        })
      }
    })

    // Check for blocked keywords
    this.config.blockedKeywords.forEach((keyword) => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        issues.push({
          type: 'security',
          severity: 'critical', // Changed from 'medium' to 'critical' for dangerous content
          message: `Blocked keyword detected: ${keyword}`,
          location: 'request',
        })
      }
    })

    return issues
  }

  /**
   * Filter content based on policies
   */
  private filterContent(request: Record<string, unknown>): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = []
    const content = JSON.stringify(request)

    // Check content length
    if (content.length > 10000) {
      issues.push({
        type: 'content',
        severity: 'low',
        message: 'Request content is unusually large',
        location: 'request',
      })
    }

    return issues
  }

  /**
   * Check complexity of the request
   */
  private checkComplexity(request: {
    task: string
    context?: { technologies?: unknown[] }
  }): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = []

    // Check task complexity
    const taskWords = request.task.split(/\s+/).length
    if (taskWords > 50) {
      issues.push({
        type: 'complexity',
        severity: 'medium',
        message: 'Task description is very long and complex',
        location: 'task',
      })
    }

    // Check context complexity
    if (
      request.context?.technologies &&
      Array.isArray(request.context.technologies) &&
      request.context.technologies.length > 10
    ) {
      issues.push({
        type: 'complexity',
        severity: 'low',
        message: 'Many technologies specified, may be overly complex',
        location: 'context.technologies',
      })
    }

    return issues
  }

  /**
   * Check against content policies
   */
  private checkPolicies(request: {
    context?: { projectType?: string }
  }): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = []

    // Check for suspicious project types
    if (request.context?.projectType && typeof request.context.projectType === 'string') {
      const suspiciousTypes = ['malware', 'exploit', 'hack', 'virus']
      if (
        suspiciousTypes.some((type) => request.context?.projectType?.toLowerCase().includes(type))
      ) {
        issues.push({
          type: 'policy',
          severity: 'critical',
          message: 'Project type violates content policy',
          location: 'context.projectType',
        })
      }
    }

    return issues
  }

  /**
   * Validate file operations in the response
   */
  private validateFileOperations(
    steps: Array<{ action: string; target: string; content?: string }>
  ): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = []

    steps.forEach((step, index) => {
      const location = `step[${index}]`

      // Check file extension
      const ext = step.target.split('.').pop()?.toLowerCase()
      if (ext && CONTENT_POLICIES.blockedExtensions.includes(`.${ext}`)) {
        issues.push({
          type: 'security',
          severity: 'critical',
          message: `Blocked file extension: .${ext}`,
          location,
        })
      }

      // Check file path
      CONTENT_POLICIES.blockedPaths.forEach((blockedPath) => {
        if (step.target.includes(blockedPath)) {
          issues.push({
            type: 'security',
            severity: 'critical',
            message: `Blocked path detected: ${blockedPath}`,
            location,
          })
        }
      })

      // Check file size
      if (step.content && step.content.length > CONTENT_POLICIES.maxFileSize) {
        issues.push({
          type: 'content',
          severity: 'high',
          message: `File content exceeds maximum size (${CONTENT_POLICIES.maxFileSize} bytes)`,
          location,
        })
      }
    })

    // Check total file count
    if (steps.length > CONTENT_POLICIES.maxFiles) {
      issues.push({
        type: 'content',
        severity: 'high',
        message: `Too many files generated (${steps.length} > ${CONTENT_POLICIES.maxFiles})`,
        location: 'response',
      })
    }

    return issues
  }

  /**
   * Validate generated content safety
   */
  private validateGeneratedContent(
    steps: Array<{ action: string; target: string; content?: string }>
  ): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = []

    steps.forEach((step, index) => {
      if (!step.content) return

      const location = `step[${index}].content`

      // Scan for security patterns
      SECURITY_PATTERNS.forEach((pattern, patternIndex) => {
        if (pattern.test(step.content!)) {
          issues.push({
            type: 'security',
            severity: 'high',
            message: `Security pattern detected in generated content (pattern ${patternIndex + 1})`,
            location,
          })
        }
      })

      // Check for blocked keywords
      this.config.blockedKeywords.forEach((keyword) => {
        if (step.content?.toLowerCase().includes(keyword.toLowerCase())) {
          issues.push({
            type: 'content',
            severity: 'medium',
            message: `Blocked keyword in generated content: ${keyword}`,
            location,
          })
        }
      })
    })

    return issues
  }

  /**
   * Check resource limits
   */
  private checkResourceLimits(
    steps: Array<{ action: string; target: string; content?: string }>
  ): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = []

    const totalSize = steps.reduce((sum, step) => sum + (step.content?.length || 0), 0)

    if (totalSize > CONTENT_POLICIES.maxFileSize * 5) {
      // 5MB total limit
      issues.push({
        type: 'content',
        severity: 'medium',
        message: 'Total generated content size is very large',
        location: 'response',
      })
    }

    return issues
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: ValidationResult['issues']): string[] {
    const recommendations: string[] = []

    const hasSecurityIssues = issues.some((i) => i.type === 'security')
    const hasComplexityIssues = issues.some((i) => i.type === 'complexity')
    const hasContentIssues = issues.some((i) => i.type === 'content')

    if (hasSecurityIssues) {
      recommendations.push('Review and sanitize input to remove potentially harmful content')
      recommendations.push('Consider using a more restrictive prompt or adding content filters')
    }

    if (hasComplexityIssues) {
      recommendations.push('Break down complex tasks into smaller, manageable components')
      recommendations.push('Provide more specific constraints to reduce scope')
    }

    if (hasContentIssues) {
      recommendations.push('Limit the number of files generated in a single operation')
      recommendations.push('Ensure generated content follows established patterns and conventions')
    }

    if (issues.length === 0) {
      recommendations.push('Request validated successfully - no issues detected')
    }

    return recommendations
  }

  /**
   * Get current configuration
   */
  getConfig(): GuardrailConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<GuardrailConfig>): void {
    this.config = GuardrailConfigSchema.parse({ ...this.config, ...updates })
  }
}
