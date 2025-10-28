# Enhanced CI/CD Pipeline

This document describes the comprehensive CI/CD pipeline implemented for the ForgeTM backend, providing enterprise-grade automation for testing, security, deployment, and monitoring.

## Overview

The CI/CD pipeline consists of multiple GitHub Actions workflows that work together to ensure code quality, security, and reliable deployments:

- **CI Pipeline** (`forgetm-ci.yml`): Comprehensive testing and validation
- **Deployment Pipeline** (`forgetm-deploy.yml`): Automated deployments to staging/production
- **Monitoring Pipeline** (`forgetm-monitoring.yml`): Continuous health and performance monitoring

## CI Pipeline (`forgetm-ci.yml`)

### Jobs Overview

#### 1. Pre-commit Checks
- **Purpose**: Fast feedback on code quality issues
- **Tools**: pre-commit hooks, mypy, ruff
- **Caching**: Python dependencies and pre-commit environment
- **Duration**: ~2-3 minutes

#### 2. Python CI
- **Purpose**: Comprehensive testing across Python versions
- **Matrix**: Python 3.10, 3.11, 3.12
- **Services**: Redis for integration testing
- **Coverage**: pytest with coverage reporting
- **Artifacts**: Test results and coverage reports

#### 3. Security Scanning
- **Purpose**: Identify security vulnerabilities and secrets
- **Tools**:
  - ggshield: Secret detection
  - Trivy: Container vulnerability scanning
  - Bandit: Python security linting
  - pip-audit: Dependency vulnerability checking
- **Outputs**: SARIF reports uploaded to GitHub Security tab

#### 4. Dependency Analysis
- **Purpose**: Generate SBOM and analyze dependencies
- **Tools**: CycloneDX for SBOM generation
- **Outputs**: Software Bill of Materials (SBOM) artifacts

#### 5. Documentation
- **Purpose**: Build and validate documentation
- **Tools**: MkDocs with Material theme
- **Outputs**: Deployed documentation site

#### 6. Container Testing
- **Purpose**: Build and test Docker containers
- **Features**:
  - Multi-stage build validation
  - Container structure testing
  - Security scanning integration
- **Outputs**: Container images with SBOM

#### 7. Integration Testing
- **Purpose**: End-to-end testing with external services
- **Services**: Ollama for LLM integration testing
- **Scope**: API endpoints, external integrations

#### 8. Performance Testing
- **Purpose**: Load and performance validation
- **Tools**: k6 for load testing
- **Metrics**: Response times, error rates, throughput

## Deployment Pipeline (`forgetm-deploy.yml`)

### Deployment Strategy

#### Automated Triggers
- **Staging**: Push to `develop` branch
- **Production**: Push to `main` branch
- **Manual**: Workflow dispatch for specific environments

#### Build and Push
- **Registry**: GitHub Container Registry (GHCR)
- **Image**: Multi-stage Docker build with security hardening
- **Security**: SBOM generation and container signing with Cosign

#### Environment Deployments

##### Staging Deployment
- **Trigger**: `develop` branch pushes
- **Environment**: `staging`
- **Validation**: Health checks and smoke tests
- **Rollback**: Automatic rollback on failure

##### Production Deployment
- **Trigger**: `main` branch pushes
- **Environment**: `production`
- **Validation**: Health checks, smoke tests, load testing
- **Rollback**: Automatic rollback on failure
- **Tagging**: Automatic deployment tags

#### Rollback Strategy
- **Trigger**: Deployment job failures
- **Action**: Kubernetes rollout undo
- **Validation**: Health checks post-rollback

## Monitoring Pipeline (`forgetm-monitoring.yml`)

### Scheduled Monitoring

#### Health Checks (Every 6 hours)
- **Endpoints**: `/health`, `/api/v1/providers`, `/openapi.json`
- **Pod Status**: Readiness and liveness checks
- **Alerts**: GitHub issues on failures

#### Performance Monitoring
- **Load Testing**: 100-200 concurrent users
- **Metrics**: P95/P99 response times, error rates
- **Thresholds**: <1000ms P95, <5% error rate

#### Security Monitoring
- **Image Verification**: Cosign signature validation
- **Vulnerability Scanning**: Trivy for HIGH/CRITICAL issues
- **Secret Detection**: ggshield for exposed credentials

### Alerting
- **Failure Response**: Automatic GitHub issue creation
- **Severity Levels**: Health, Performance, Security
- **Escalation**: Environment-specific alerting

## Security Features

### Secret Management
- **Detection**: ggshield integration in CI pipeline
- **Prevention**: Pre-commit hooks and CI checks
- **Storage**: GitHub Secrets for deployment credentials

### Container Security
- **Base Images**: Minimal, security-hardened images
- **Scanning**: Trivy vulnerability scanning
- **Signing**: Cosign container signing
- **SBOM**: CycloneDX bill of materials

### Access Control
- **Environments**: Protected environments for staging/production
- **Approvals**: Required reviews for production deployments
- **Branch Protection**: Required CI checks for merges

## Performance Optimization

### Caching Strategy
- **Dependencies**: Python packages, Node modules, Docker layers
- **Tools**: Pre-commit environments, security tools
- **Artifacts**: Test results, coverage reports, SBOMs

### Parallel Execution
- **Matrix Builds**: Parallel testing across Python versions
- **Independent Jobs**: Security, docs, containers run in parallel
- **Resource Optimization**: Appropriate runner sizes per job

## Monitoring and Observability

### Metrics Collection
- **CI Performance**: Job durations and success rates
- **Test Coverage**: Code coverage trends
- **Security Findings**: Vulnerability counts over time

### Alerting Integration
- **GitHub Issues**: Automatic issue creation for failures
- **Slack Integration**: Optional webhook notifications
- **Dashboard**: GitHub Actions insights and custom dashboards

## Local Development Integration

### Pre-commit Hooks
```bash
# Install pre-commit hooks
pre-commit install

# Run on all files
pre-commit run --all-files
```

### Local Testing
```bash
# Run security checks
bash tools/security_check.sh

# Run linting
bash tools/lint_all.sh

# Run smoke tests
bash tools/smoke.sh
```

## Configuration Management

### Environment Variables
- **CI Secrets**: Stored in GitHub repository secrets
- **Environment Config**: Separate configs for staging/production
- **Service Discovery**: Kubernetes service names for inter-service communication

### Infrastructure as Code
- **Kubernetes Manifests**: Version-controlled deployment configs
- **Dockerfiles**: Multi-stage builds with security best practices
- **Helm Charts**: Optional for complex deployments

## Troubleshooting

### Common Issues

#### CI Pipeline Failures
- **Pre-commit Issues**: Run `pre-commit run --all-files` locally
- **Test Failures**: Check test logs and run `pytest` locally
- **Security Alerts**: Review ggshield output and fix exposed secrets

#### Deployment Issues
- **Image Pull Errors**: Check GHCR permissions and image tags
- **Pod Failures**: Review Kubernetes logs with `kubectl logs`
- **Health Check Failures**: Verify service endpoints and configurations

#### Monitoring Alerts
- **Health Check Failures**: Check application logs and resource usage
- **Performance Degradation**: Review recent changes and scaling configuration
- **Security Alerts**: Update dependencies and review vulnerability reports

### Debugging Commands

```bash
# Check CI workflow status
gh run list --workflow=forgetm-ci.yml

# View workflow logs
gh run view <run-id> --log

# Check deployment status
kubectl get pods -n forge-production
kubectl logs -f deployment/forge-backend -n forge-production

# Monitor performance
kubectl top pods -n forge-production
```

## Future Enhancements

### Planned Improvements
- **Blue-Green Deployments**: Zero-downtime deployment strategy
- **Canary Releases**: Gradual rollout with traffic splitting
- **Advanced Monitoring**: Integration with Prometheus/Grafana
- **Compliance Automation**: SOC2, GDPR compliance checks
- **Multi-Cloud Support**: Azure/AWS deployment options

### Integration Opportunities
- **ArgoCD**: GitOps deployment automation
- **Tekton**: Kubernetes-native CI/CD pipelines
- **Keptn**: Automated deployment lifecycle management
- **Backstage**: Developer portal integration

## Support and Maintenance

### Team Responsibilities
- **Developers**: Maintain test coverage and fix security issues
- **DevOps**: Monitor pipeline performance and update infrastructure
- **Security**: Review vulnerability reports and update policies

### Documentation Updates
- **Pipeline Changes**: Update this document when modifying workflows
- **New Tools**: Document new security or testing tools added
- **Troubleshooting**: Add common issues and solutions as encountered

---

**Last Updated**: October 25, 2025
**Pipeline Version**: v2.0
**Owner**: ForgeTM Team
