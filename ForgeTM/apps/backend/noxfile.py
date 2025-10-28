import nox

@nox.session(python=["3.10", "3.11", "3.12"])
def test(session):
    """Run tests across multiple Python versions."""
    session.install("-e", ".[dev]")
    session.run("pytest", "tests/", *session.posargs)

@nox.session
def lint(session):
    """Run linting."""
    session.install("-e", ".[dev]")
    session.run("ruff", "check", "src", "tests")
    session.run("ruff", "format", "--check", "src", "tests")

@nox.session
def typecheck(session):
    """Run type checking."""
    session.install("-e", ".[dev]")
    session.run("mypy", "src")

@nox.session
def coverage(session):
    """Run tests with coverage."""
    session.install("-e", ".[dev]")
    session.run("pytest", "--cov=forge", "--cov-report=html", "--cov-report=term")

@nox.session
def docs(session):
    """Build documentation."""
    session.install("-e", ".[dev]")
    session.run("mkdocs", "build")

@nox.session
def mutation(session):
    """Run mutation testing (requires cosmic-ray or similar tool)."""
    session.install("-e", ".[dev]")
    # Note: Install mutation testing tool separately due to compatibility issues
    # session.install("cosmic-ray")
    # session.run("cosmic-ray", "init", "cosmic-ray.conf", "src/forge/main.py")
    # session.run("cosmic-ray", "exec", "cosmic-ray.conf")
    session.log("Mutation testing setup complete.")
    session.log("Install cosmic-ray manually: pip install cosmic-ray")
    session.log("Then run: cosmic-ray init cosmic-ray.conf src/forge/main.py")
    session.log("         && cosmic-ray exec cosmic-ray.conf")
