# Security Testing Guide

Comprehensive security testing suite for the Document Uploader application. This suite tests for SQL injection, XSS, command injection, path traversal, and other common web vulnerabilities.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Coverage](#test-coverage)
- [Running Tests](#running-tests)
- [Understanding Results](#understanding-results)
- [Continuous Integration](#continuous-integration)
- [Adding New Tests](#adding-new-tests)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

1. **Backend must be running**: `http://localhost:8000`
2. **Node.js and npm installed**
3. **Playwright installed** (automatic with npm install)

### Run All Security Tests

```bash
npm run test:security
```

### Run Specific Form Tests

```bash
# Test Contact form only
npm run test:security:contact

# Test Login form only
npm run test:security:login
```

### Run with UI Mode (Interactive)

```bash
npm run test:security:ui
```

### Run with Full Report

```bash
npm run test:security:full
```

---

## Test Coverage

### Forms Tested

1. **Contact Us Form** (`/contact`)
   - Name field
   - Email field
   - Phone field
   - Subject field
   - Current Residence field
   - Message field

2. **Login Form** (`/login`)
   - Email field
   - Password field
   - Role Code field

### Vulnerability Types Tested

#### 1. SQL Injection (Critical Priority)

Tests **40+ SQL injection payloads** including:

- ✅ Classic OR 1=1 bypass attempts
- ✅ Union-based SQL injection
- ✅ Time-based blind SQL injection
- ✅ Boolean-based blind SQL injection
- ✅ Stacked queries (DROP TABLE attempts)
- ✅ Comment-based injection
- ✅ Database-specific injections (MySQL, PostgreSQL, SQL Server)
- ✅ Error-based SQL injection
- ✅ Hex encoding bypass attempts

**Example payloads tested:**
```sql
' OR '1'='1
' UNION SELECT NULL, username, password FROM users--
'; DROP TABLE users;--
admin'--
' OR SLEEP(5)--
```

#### 2. Cross-Site Scripting (XSS)

Tests **10+ XSS payloads** including:

- ✅ Basic `<script>` tag injection
- ✅ Event handler XSS (onerror, onload, onfocus)
- ✅ SVG-based XSS
- ✅ JavaScript protocol injection
- ✅ DOM-based XSS
- ✅ Iframe XSS
- ✅ Polyglot XSS (works in multiple contexts)
- ✅ HTML-encoded XSS
- ✅ Unicode-encoded XSS

**Example payloads tested:**
```html
<script>alert("XSS")</script>
<img src=x onerror=alert("XSS")>
<svg/onload=alert("XSS")>
javascript:alert("XSS")
```

#### 3. Command Injection

Tests **5+ command injection payloads**:

- ✅ Semicolon command chaining (`;`)
- ✅ Pipe command chaining (`|`)
- ✅ Ampersand command chaining (`&`)
- ✅ Backtick command substitution
- ✅ Dollar syntax substitution (`$()`)

**Example payloads tested:**
```bash
; ls -la
| cat /etc/passwd
& whoami &
`id`
$(whoami)
```

#### 4. Path Traversal

Tests **5+ directory traversal payloads**:

- ✅ Basic path traversal (`../../../`)
- ✅ Windows path traversal
- ✅ URL-encoded path traversal
- ✅ Double-encoded path traversal
- ✅ Null byte injection

**Example payloads tested:**
```
../../../etc/passwd
..\\..\\..\\windows\\system32\\config\\sam
%2e%2e%2f%2e%2e%2fetc%2fpasswd
```

#### 5. LDAP Injection

Tests **2+ LDAP injection payloads**:

- ✅ LDAP OR injection
- ✅ Wildcard injection

#### 6. XML Injection (XXE)

Tests **2+ XML payloads**:

- ✅ Basic XXE file reading
- ✅ Billion laughs XML bomb

#### 7. NoSQL Injection

Tests **3+ NoSQL payloads**:

- ✅ MongoDB `$ne` operator
- ✅ MongoDB `$gt` operator
- ✅ MongoDB `$regex` injection

#### 8. Special Characters & Edge Cases

Tests **4+ edge cases**:

- ✅ Null bytes (`\x00`)
- ✅ Unicode bypass
- ✅ Newline injection
- ✅ CRLF injection

### Additional Security Tests

#### Authentication Bypass Tests (Login Form)

- ✅ **10+ authentication bypass attempts**
- ✅ Admin user injection
- ✅ Comment-based bypass
- ✅ OR condition bypass
- ✅ Union-based authentication bypass

#### Password Security Tests

- ✅ Empty password handling
- ✅ Extremely long passwords (10,000+ chars)
- ✅ Null byte injection
- ✅ Template injection in password field

#### Role Escalation Tests

- ✅ Role code SQL injection
- ✅ Root/administrator role attempts
- ✅ Path traversal in role field

#### Time-based Attack Detection

- ✅ MySQL SLEEP injection
- ✅ SQL Server WAITFOR DELAY
- ✅ PostgreSQL pg_sleep
- ✅ Verifies responses are not delayed

#### Rate Limiting Tests

- ✅ Multiple rapid login attempts
- ✅ Rate limit message detection

#### User Enumeration Prevention

- ✅ Verifies error messages don't reveal user existence
- ✅ Generic error message validation

---

## Running Tests

### Method 1: NPM Scripts (Recommended)

#### Run All Security Tests
```bash
npm run test:security
```

#### Run Specific Form Tests
```bash
# Contact form only
npm run test:security:contact

# Login form only
npm run test:security:login
```

#### Run with Interactive UI
```bash
npm run test:security:ui
```

#### View Previous Test Report
```bash
npm run test:security:report
```

#### Run Full Suite with Report
```bash
npm run test:security:full
```

### Method 2: Bash Script (Advanced)

```bash
# Run all tests with HTML report
./scripts/run-security-tests.sh --full --report

# Run contact form tests only
./scripts/run-security-tests.sh --contact

# Run login form tests only
./scripts/run-security-tests.sh --login

# Run in CI mode (no interactive prompts)
./scripts/run-security-tests.sh --ci --report

# Run with debug output
./scripts/run-security-tests.sh --debug
```

### Method 3: Direct Playwright Commands

```bash
# Run all security tests
npx playwright test e2e/security-tests/

# Run specific test file
npx playwright test e2e/security-tests/contact-form.security.spec.ts

# Run with headed browser (see what's happening)
npx playwright test e2e/security-tests/ --headed

# Run with debug mode
npx playwright test e2e/security-tests/ --debug

# Run specific test by name
npx playwright test -g "Should block SQL injection"
```

---

## Understanding Results

### Test Output

#### ✅ Pass (Green)
```
✓ Should block SQL injection in NAME field: Classic OR 1=1
```
**Meaning**: Backend successfully blocked the attack. Form either:
- Showed a validation error
- Accepted input but sanitized/escaped it properly
- Returned generic error without exposing sensitive info

#### ❌ Fail (Red)
```
✗ Should block SQL injection in EMAIL field: Union-based SQLi
```
**Meaning**: Potential vulnerability detected. Investigate:
- Is SQL error message exposed?
- Was authentication bypassed?
- Is XSS executing in the page?
- Check screenshots in `test-results/`

### What Tests Verify

Tests verify that the backend:

1. **Does NOT expose SQL errors**
   - ❌ Bad: "You have an error in your SQL syntax"
   - ✅ Good: "Invalid input" or generic error

2. **Does NOT execute XSS payloads**
   - ❌ Bad: Alert dialog appears
   - ✅ Good: Script tags are escaped or stripped

3. **Does NOT execute commands**
   - ❌ Bad: `/etc/passwd` content displayed
   - ✅ Good: Input sanitized, no command output

4. **Does NOT allow authentication bypass**
   - ❌ Bad: User logged in with SQL injection
   - ✅ Good: Login failed, stayed on login page

5. **Does NOT reveal sensitive information**
   - ❌ Bad: "User not found" vs "Wrong password"
   - ✅ Good: "Invalid credentials" (generic)

### Test Reports

#### HTML Report

After running tests with `--report` flag:

```bash
playwright-report/index.html
```

View it:
```bash
npm run test:security:report
```

The report includes:
- ✅ Test pass/fail status
- 📸 Screenshots of failures
- 🎥 Video recordings of test runs
- 📊 Execution timeline
- 🔍 Detailed error messages

#### JSON Report

Machine-readable results:
```bash
test-results/security-test-results.json
```

Use for:
- CI/CD integration
- Custom reporting
- Trend analysis over time

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Security Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    # Run daily at 2 AM
    - cron: '0 2 * * *'

jobs:
  security-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start backend
        run: |
          cd ../document-uploader-backend
          php artisan serve &
          sleep 5

      - name: Run security tests
        run: npm run test:security

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-test-results
          path: |
            playwright-report/
            test-results/
```

### GitLab CI Example

```yaml
security-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal

  before_script:
    - npm ci
    - cd ../backend && php artisan serve &
    - sleep 5
    - cd ../frontend

  script:
    - npm run test:security

  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    expire_in: 30 days
```

### Jenkins Pipeline Example

```groovy
pipeline {
  agent any

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
        sh 'npx playwright install --with-deps chromium'
      }
    }

    stage('Start Services') {
      steps {
        sh 'cd ../backend && php artisan serve &'
        sleep 5
      }
    }

    stage('Security Tests') {
      steps {
        sh 'npm run test:security'
      }
    }
  }

  post {
    always {
      publishHTML([
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        reportName: 'Security Test Report'
      ])
      archiveArtifacts 'test-results/**/*'
    }
  }
}
```

---

## Adding New Tests

### 1. Add New Payload

Edit `e2e/security-tests/payloads/injection-payloads.ts`:

```typescript
export const MY_NEW_PAYLOADS: SecurityPayload[] = [
  {
    name: 'My attack name',
    value: 'attack payload here',
    type: 'sql', // or 'xss', 'command', etc.
    severity: 'critical', // or 'high', 'medium', 'low'
    description: 'Description of what this tests'
  },
];

// Add to ALL_PAYLOADS export
export const ALL_PAYLOADS: SecurityPayload[] = [
  ...SQL_INJECTION_PAYLOADS,
  ...XSS_PAYLOADS,
  ...MY_NEW_PAYLOADS, // Add here
];
```

### 2. Create New Test File

Create `e2e/security-tests/my-form.security.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { SQL_INJECTION_PAYLOADS } from './payloads/injection-payloads';

test.describe('My Form Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-form');
  });

  SQL_INJECTION_PAYLOADS.forEach((payload) => {
    test(`Should block ${payload.name}`, async ({ page }) => {
      await page.fill('input[name="myfield"]', payload.value);
      await page.click('button[type="submit"]');

      // Verify no vulnerability
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('SQL');
    });
  });
});
```

### 3. Run New Tests

```bash
npx playwright test e2e/security-tests/my-form.security.spec.ts
```

---

## Troubleshooting

### Backend Not Running

**Error**: `Backend is not running on http://localhost:8000`

**Solution**:
```bash
cd ../document-uploader-backend
php artisan serve
```

### Frontend Not Starting

**Error**: `Could not connect to http://localhost:4200`

**Solution**: Playwright will auto-start it, but you can manually:
```bash
npm start
```

### Tests Timing Out

**Error**: `Test timeout of 30000ms exceeded`

**Solution**: Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Browser Not Found

**Error**: `browserType.launch: Executable doesn't exist`

**Solution**:
```bash
npx playwright install chromium
```

### Permission Denied on Script

**Error**: `Permission denied: ./scripts/run-security-tests.sh`

**Solution**:
```bash
chmod +x ./scripts/run-security-tests.sh
```

### Tests Fail But Should Pass

**Checklist**:
1. ✅ Is backend validation properly implemented?
2. ✅ Are SQL queries using parameterized statements?
3. ✅ Is XSS protection enabled (Content-Security-Policy)?
4. ✅ Are error messages generic (not exposing details)?
5. ✅ Is input validation happening on both frontend and backend?

### False Positives

Some tests may fail if:
- Backend returns **200 OK** even for invalid input (check response body)
- Frontend shows **success message** but backend rejected it
- **Rate limiting** blocks requests (adjust test delays)

---

## Best Practices

### 1. Run Tests Regularly

Schedule security tests:
- ✅ **Before every deployment**
- ✅ **After security patches**
- ✅ **Weekly via CI/CD**
- ✅ **After adding new forms/endpoints**

### 2. Review Failures Immediately

When tests fail:
1. 📸 Check screenshots in `test-results/`
2. 📹 Watch video recordings
3. 🔍 Review backend logs
4. 🛠️ Fix vulnerability
5. ✅ Re-run tests to verify fix

### 3. Keep Payloads Updated

Update payload library when:
- New CVEs are discovered
- OWASP Top 10 is updated
- New attack techniques emerge

### 4. Test Both Frontend and Backend

These E2E tests verify:
- ✅ Frontend validation
- ✅ Backend security
- ✅ End-to-end flow

Complement with:
- Unit tests for validation functions
- API security tests (Postman/Newman)
- Penetration testing (manual)

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Playwright Documentation](https://playwright.dev/)
- [SQL Injection Cheat Sheet](https://portswigger.net/web-security/sql-injection/cheat-sheet)
- [XSS Filter Evasion Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html)

---

## Support

For issues or questions:
1. Check this documentation
2. Review test output and screenshots
3. Check Playwright logs
4. Review backend security implementation

**Remember**: Security testing is an ongoing process. These automated tests are one layer of defense. Combine with code reviews, penetration testing, and security audits for comprehensive protection.
