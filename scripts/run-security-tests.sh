#!/bin/bash

##############################################################################
# Security Testing Script
# Runs comprehensive security tests on all user-facing forms
#
# Usage:
#   ./scripts/run-security-tests.sh [options]
#
# Options:
#   --quick       Run only critical/high severity tests
#   --full        Run all security tests (default)
#   --contact     Run only Contact form tests
#   --login       Run only Login form tests
#   --report      Generate HTML report after tests
#   --ci          Run in CI mode (no interactive prompts)
#   --debug       Run with debug output
#
# Examples:
#   ./scripts/run-security-tests.sh --quick
#   ./scripts/run-security-tests.sh --contact --report
#   ./scripts/run-security-tests.sh --full --report
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
RUN_MODE="full"
GENERATE_REPORT=false
CI_MODE=false
DEBUG_MODE=false
TEST_FILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick)
      RUN_MODE="quick"
      shift
      ;;
    --full)
      RUN_MODE="full"
      shift
      ;;
    --contact)
      TEST_FILE="e2e/security-tests/contact-form.security.spec.ts"
      shift
      ;;
    --login)
      TEST_FILE="e2e/security-tests/login-form.security.spec.ts"
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --ci)
      CI_MODE=true
      shift
      ;;
    --debug)
      DEBUG_MODE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Print banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         Security Testing Suite - Document Uploader       ║"
echo "║                                                           ║"
echo "║  Testing for: SQL Injection, XSS, Command Injection,     ║"
echo "║               Path Traversal, and other vulnerabilities   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Backend is running${NC}"
else
  echo -e "${RED}✗ Backend is not running on http://localhost:8000${NC}"
  echo -e "${YELLOW}Please start the backend server before running security tests${NC}"
  if [[ "$CI_MODE" == false ]]; then
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  else
    exit 1
  fi
fi

# Check if frontend is running (Playwright will start it if not)
echo -e "${YELLOW}Checking if frontend is running...${NC}"
if curl -s http://localhost:4200 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Frontend is running${NC}"
else
  echo -e "${YELLOW}! Frontend is not running - Playwright will start it${NC}"
fi

# Create test results directory
mkdir -p test-results
mkdir -p playwright-report

# Build test command
TEST_CMD="npx playwright test"

if [[ -n "$TEST_FILE" ]]; then
  TEST_CMD="$TEST_CMD $TEST_FILE"
else
  TEST_CMD="$TEST_CMD e2e/security-tests/"
fi

if [[ "$DEBUG_MODE" == true ]]; then
  TEST_CMD="$TEST_CMD --debug"
fi

# Add grep for quick mode (only critical/high)
if [[ "$RUN_MODE" == "quick" ]]; then
  echo -e "${YELLOW}Running in QUICK mode (critical/high severity tests only)${NC}"
  # This would require test tagging, for now we run all
fi

# Run the tests
echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════"
echo "  Starting Security Tests"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

# Run tests and capture exit code
set +e
eval $TEST_CMD
TEST_EXIT_CODE=$?
set -e

# Print results summary
echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════"
echo "  Test Results Summary"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

if [[ $TEST_EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}✓ All security tests passed!${NC}"
  echo -e "${GREEN}  No vulnerabilities detected in tested attack vectors${NC}"
else
  echo -e "${RED}✗ Some security tests failed${NC}"
  echo -e "${RED}  Please review the test output above for details${NC}"
  echo -e "${YELLOW}  Failures may indicate:${NC}"
  echo -e "${YELLOW}    - Actual vulnerabilities that need fixing${NC}"
  echo -e "${YELLOW}    - Backend validation that needs improvement${NC}"
  echo -e "${YELLOW}    - Error handling that exposes sensitive info${NC}"
fi

# Generate HTML report if requested
if [[ "$GENERATE_REPORT" == true ]]; then
  echo ""
  echo -e "${YELLOW}Generating HTML report...${NC}"
  npx playwright show-report --host 127.0.0.1 --port 9323 &
  REPORT_PID=$!

  echo -e "${GREEN}✓ HTML report available at: http://127.0.0.1:9323${NC}"
  echo -e "${YELLOW}  Report files saved in: playwright-report/${NC}"

  if [[ "$CI_MODE" == false ]]; then
    echo ""
    read -p "Press Enter to close the report server..."
    kill $REPORT_PID 2>/dev/null || true
  fi
fi

# Print additional information
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Additional Information${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "Test results JSON: ${YELLOW}test-results/security-test-results.json${NC}"
echo -e "HTML report: ${YELLOW}playwright-report/index.html${NC}"
echo -e "Screenshots: ${YELLOW}test-results/${NC}"
echo ""
echo -e "${YELLOW}Note: These tests verify that your backend properly handles${NC}"
echo -e "${YELLOW}      malicious input. Test failures may indicate security${NC}"
echo -e "${YELLOW}      vulnerabilities that need to be addressed.${NC}"
echo ""

# Exit with the test exit code
exit $TEST_EXIT_CODE
