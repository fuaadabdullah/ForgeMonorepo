# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Biome Integration**: Added comprehensive Biome v1.9.4+ support to smithy for enterprise-grade JavaScript/TypeScript code quality
- **Multi-language Code Quality**: Unified linting, formatting, and import organization across Python and JavaScript/TypeScript
- **Smithy Biome Commands**: Added 6 new CLI commands (biome-check, biome-fix, biome-format, biome-imports, biome-init-config, biome-diagnostics)
- **World-class Biome Configuration**: Enterprise rules, performance optimizations, and gradual adoption overrides
- Initial MkDocs documentation setup
- OpenTelemetry instrumentation for observability
- Pydantic Settings for configuration management
- SOPS + age for secret encryption
- Container security with Trivy and Cosign
- Property-based testing with Hypothesis
- 90% code coverage enforcement

### Changed

- Migrated to uv for dependency management
- Updated Ruff configuration for stricter linting
- Enhanced CI/CD with CodeQL for Python analysis

### Fixed

- Various configuration and packaging improvements
