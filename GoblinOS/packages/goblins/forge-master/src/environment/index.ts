/**
 * @goblinos/forge-master
 *
 * Environment Manager - Infrastructure as Code and containerization
 */

import { config } from 'dotenv'
import { mkdir, writeFile } from 'fs-extra'
import type { ContainerConfig, EnvironmentResult, IaCConfig, Logger } from '../types.js'
import { type CombinedEnv, combinedEnvSchema } from './schema.js'

export interface EnvironmentManagerOptions {
  logger?: Logger
}

export class EnvironmentManager {
  private logger: Logger
  private loadedEnv?: CombinedEnv

  constructor(options: EnvironmentManagerOptions = {}) {
    this.logger = options.logger || (console as unknown as Logger)
  }

  /**
   * Load and validate Smithy environment variables
   *
   * TODO: Add OpenTelemetry spans for observability:
   * - env.load: Track loading performance
   * - env.validate: Track validation success/failure
   * - env.error: Track error types and missing vars
   * Attributes: env.source, env.missing_vars, env.schema_version
   */
  async loadSmithyEnv(
    options: {
      envPath?: string
      projectOverrides?: Partial<CombinedEnv>
      agentOverrides?: Partial<CombinedEnv>
    } = {}
  ): Promise<CombinedEnv> {
    try {
      // Load .env file
      const envPath = options.envPath || '.env'
      config({ path: envPath })

      // Get raw environment variables
      const rawEnv = process.env as Record<string, string | undefined>

      // Merge overlays
      const mergedEnv = {
        ...rawEnv,
        ...options.projectOverrides,
        ...options.agentOverrides,
      }

      // Validate against schema
      const validatedEnv = combinedEnvSchema.parse(mergedEnv)

      this.loadedEnv = validatedEnv

      this.logger.info('Environment loaded successfully', {
        envPath,
        hasProjectOverrides: !!options.projectOverrides,
        hasAgentOverrides: !!options.agentOverrides,
      })

      return validatedEnv
    } catch (error) {
      this.logger.error('Failed to load environment', { error, envPath: options.envPath })

      // Provide helpful error messages
      if (error instanceof Error) {
        const missingVars = this.extractMissingVars(error.message)
        if (missingVars.length > 0) {
          this.logger.error('Missing required environment variables', {
            missing: missingVars,
            suggestion:
              'Add to .env file or update .env.example. See Obsidian/API_KEYS_MANAGEMENT.md',
          })

          // Auto-update .env.example
          await this.updateEnvExample(missingVars)
        }
      }

      throw error
    }
  }

  /**
   * Get loaded environment (throws if not loaded)
   */
  getLoadedEnv(): CombinedEnv {
    if (!this.loadedEnv) {
      throw new Error('Environment not loaded. Call loadSmithyEnv() first.')
    }
    return this.loadedEnv
  }

  /**
   * Extract missing variables from Zod error message
   */
  private extractMissingVars(errorMessage: string): string[] {
    const missing: string[] = []
    const regex = /Required at "([^"]+)"/g
    let match
    while ((match = regex.exec(errorMessage)) !== null) {
      missing.push(match[1])
    }
    return missing
  }

  /**
   * Auto-update .env.example with new variables
   */
  async updateEnvExample(newVars: string[]): Promise<void> {
    const envExamplePath = '.env.example'
    let currentContent = ''

    try {
      // Read current .env.example
      const fs = await import('node:fs')
      if (fs.existsSync(envExamplePath)) {
        currentContent = fs.readFileSync(envExamplePath, 'utf-8')
      }
    } catch (error) {
      this.logger.warn('Could not read .env.example', { error })
    }

    // Add new variables
    let updatedContent = currentContent
    for (const varName of newVars) {
      if (!currentContent.includes(varName)) {
        updatedContent += `\n# ${varName}=your_value_here\n`
      }
    }

    // Write back
    try {
      await writeFile(envExamplePath, updatedContent)
      this.logger.info('Updated .env.example with new variables', { newVars })
    } catch (error) {
      this.logger.error('Failed to update .env.example', { error })
    }
  }

  /**
   * Setup complete environment (IaC + containers + provisioning)
   */
  async setupEnvironment(config: {
    type: string
    environments: string[]
  }): Promise<EnvironmentResult> {
    this.logger.info('Setting up environment', { config })

    const results = await Promise.all([
      this.generateIaC({
        provider: 'terraform',
        cloud: 'aws',
        resources: ['vpc', 'ecs', 'rds'],
        environment: 'production',
      }),
      this.createDevContainer({
        baseImage: 'python:3.11',
        features: ['docker-in-docker', 'aws-cli'],
        extensions: ['ms-python.python', 'hashicorp.terraform'],
      }),
    ])

    return {
      files: results.flatMap((r) => r.files),
      commands: results.flatMap((r) => r.commands),
      variables: {
        ENVIRONMENT: config.environments[0] || 'development',
        PROJECT_TYPE: config.type,
      },
    }
  }

  /**
   * Generate Infrastructure as Code templates
   */
  async generateIaC(config: IaCConfig): Promise<{ files: string[]; commands: string[] }> {
    this.logger.info('Generating IaC templates', { config })

    const files: string[] = []
    const commands: string[] = []

    switch (config.provider) {
      case 'terraform':
        files.push(...(await this.generateTerraform(config)))
        commands.push('terraform init', 'terraform plan', 'terraform apply')
        break
      case 'arm':
        files.push(...(await this.generateARM(config)))
        commands.push('az deployment group create --template-file main.bicep')
        break
      case 'cloudformation':
        files.push(...(await this.generateCloudFormation(config)))
        commands.push('aws cloudformation deploy --template-file template.yaml')
        break
    }

    return { files, commands }
  }

  /**
   * Generate Terraform configuration
   */
  private async generateTerraform(config: IaCConfig): Promise<string[]> {
    const files = ['main.tf', 'variables.tf', 'outputs.tf', 'terraform.tfvars']

    // Generate main.tf
    const mainTf = `
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = {
    Name = "${config.environment}-vpc"
    Environment = "${config.environment}"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${config.environment}-cluster"
  tags = {
    Environment = "${config.environment}"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  allocated_storage    = 20
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.micro"
  db_name             = var.db_name
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = true
  tags = {
    Environment = "${config.environment}"
  }
}
`

    // Generate variables.tf
    const variablesTf = `
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
`

    // Generate outputs.tf
    const outputsTf = `
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "db_endpoint" {
  description = "Database endpoint"
  value       = aws_db_instance.main.endpoint
}
`

    // Generate terraform.tfvars
    const tfvars = `
region     = "us-east-1"
vpc_cidr   = "10.0.0.0/16"
db_name    = "myapp"
db_username = "admin"
`

    // Write files
    await writeFile('main.tf', mainTf)
    await writeFile('variables.tf', variablesTf)
    await writeFile('outputs.tf', outputsTf)
    await writeFile('terraform.tfvars', tfvars)

    return files
  }

  /**
   * Generate ARM templates (placeholder)
   */
  private async generateARM(_config: IaCConfig): Promise<string[]> {
    // TODO: Implement ARM template generation
    return ['main.bicep', 'parameters.json']
  }

  /**
   * Generate CloudFormation templates (placeholder)
   */
  private async generateCloudFormation(_config: IaCConfig): Promise<string[]> {
    // TODO: Implement CloudFormation template generation
    return ['template.yaml', 'parameters.json']
  }

  /**
   * Create development container configuration
   */
  async createDevContainer(
    config: ContainerConfig
  ): Promise<{ files: string[]; commands: string[] }> {
    this.logger.info('Creating dev container', { config })

    const devcontainerJson = {
      name: 'Forge Guild Development',
      image: config.baseImage,
      features: {
        'ghcr.io/devcontainers/features/docker-in-docker:2': {},
        'ghcr.io/devcontainers/features/aws-cli:1': {},
      },
      extensions: config.extensions || [],
      ports: config.ports || [8000, 3000],
      postCreateCommand: 'pip install -r requirements.txt',
      remoteUser: 'vscode',
    }

    const dockerfile = `
FROM ${config.baseImage}

# Install additional tools
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspaces

# Default command
CMD ["sleep", "infinity"]
`

    await mkdir('.devcontainer', { recursive: true })
    await writeFile('.devcontainer/devcontainer.json', JSON.stringify(devcontainerJson, null, 2))
    await writeFile('.devcontainer/Dockerfile', dockerfile)

    return {
      files: ['.devcontainer/devcontainer.json', '.devcontainer/Dockerfile'],
      commands: ['devcontainer build', 'devcontainer open'],
    }
  }

  /**
   * Setup automated provisioning scripts
   */
  async setupProvisioning(config: { environments: string[] }): Promise<{
    files: string[]
    commands: string[]
  }> {
    this.logger.info('Setting up provisioning scripts', { config })

    const scripts = config.environments.map(
      (env) => `
#!/bin/bash
# Provision ${env} environment

set -e

echo "Provisioning ${env} environment..."

# IaC deployment
terraform workspace select ${env} || terraform workspace new ${env}
terraform apply -auto-approve

# Configuration deployment
kubectl apply -f k8s/${env}/

echo "${env} environment provisioned successfully"
`
    )

    const files: string[] = []
    for (let i = 0; i < config.environments.length; i++) {
      const filename = `provision-${config.environments[i]}.sh`
      await writeFile(filename, scripts[i])
      files.push(filename)
    }

    return {
      files,
      commands: config.environments.map(
        (env) => `chmod +x provision-${env}.sh && ./provision-${env}.sh`
      ),
    }
  }
}
