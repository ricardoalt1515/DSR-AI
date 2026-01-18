.PHONY: lint lint-fix format format-check typecheck check check-ci test test-cov ci install-dev

# ============================================================================
# Development Tooling Commands
# ============================================================================
# Prerequisites:
#   1. uv installed: curl -LsSf https://astral.sh/uv/install.sh | sh
#   2. Run 'make install-dev' to set up local venv with tooling
#   3. Docker services running for tests: docker compose up -d postgres redis
# ============================================================================

# Install dev dependencies in local venv (ruff, ty, pytest)
install-dev:
	uv venv --python 3.11
	uv pip install ruff ty pytest pytest-asyncio pytest-cov httpx

# ============================================================================
# Linting (Ruff)
# ============================================================================

# Check for linting errors (no changes)
lint:
	.venv/bin/ruff check .

# Check and auto-fix linting errors
lint-fix:
	.venv/bin/ruff check --fix .

# ============================================================================
# Formatting (Ruff)
# ============================================================================

# Auto-format all files
format:
	.venv/bin/ruff format .

# Check formatting without changes (for CI)
format-check:
	.venv/bin/ruff format --check .

# ============================================================================
# Type Checking (ty - Astral)
# ============================================================================

typecheck:
	.venv/bin/ty check

# ============================================================================
# Combined Commands
# ============================================================================

# Development mode: fix everything automatically
check:
	.venv/bin/ruff check --fix .
	.venv/bin/ruff format .
	.venv/bin/ty check

# CI mode: verify only, no changes (fails on any issue)
check-ci:
	.venv/bin/ruff check .
	.venv/bin/ruff format --check .
	.venv/bin/ty check

# ============================================================================
# Testing (Pytest)
# ============================================================================
# Note: Tests require Postgres and Redis running via docker compose
#   docker compose up -d postgres redis

# Run all tests
test:
	.venv/bin/pytest

# Run tests with coverage report
test-cov:
	.venv/bin/pytest --cov=app --cov-report=html --cov-report=term

# Run specific test file
# Usage: make test-file FILE=tests/test_location_contacts.py
test-file:
	.venv/bin/pytest -v $(FILE)

# ============================================================================
# Full CI Pipeline (what GitHub Actions should run)
# ============================================================================

ci: check-ci test
