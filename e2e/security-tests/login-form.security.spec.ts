import { test, expect, Page } from '@playwright/test';
import {
  SQL_INJECTION_PAYLOADS,
  XSS_PAYLOADS,
  NOSQL_INJECTION_PAYLOADS,
  SecurityPayload
} from './payloads/injection-payloads';

/**
 * Security Tests for Login Form
 * Tests authentication bypass attempts and injection vulnerabilities
 */

test.describe('Login Form Security Tests', () => {
  const LOGIN_URL = '/login';

  const VALID_CREDENTIALS = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    role_code: 'admin'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
  });

  /**
   * Helper to submit login form with payload
   */
  async function submitLoginWithPayload(
    page: Page,
    field: 'email' | 'password' | 'role_code',
    payload: string
  ): Promise<void> {
    await page.fill('input[formControlName="email"]',
      field === 'email' ? payload : VALID_CREDENTIALS.email);
    await page.fill('input[formControlName="password"]',
      field === 'password' ? payload : VALID_CREDENTIALS.password);
    await page.fill('input[formControlName="role_code"]',
      field === 'role_code' ? payload : VALID_CREDENTIALS.role_code);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
  }

  /**
   * Verify authentication was NOT bypassed
   */
  async function verifyAuthenticationNotBypassed(page: Page): Promise<void> {
    // Should not be redirected to admin/dashboard
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/admin');
    expect(currentUrl).not.toContain('/dashboard');

    // Should show error or still be on login page
    const isOnLoginPage = currentUrl.includes('/login');
    const hasErrorMessage = await page.locator('.alert-danger, .error-message, .text-danger').count() > 0;

    expect(isOnLoginPage || hasErrorMessage).toBeTruthy();

    // Verify no SQL errors are exposed
    const pageContent = await page.textContent('body');
    const sqlErrorPatterns = [
      /SQL syntax/i,
      /mysql_fetch/i,
      /database error/i,
      /SQLSTATE/i,
    ];

    for (const pattern of sqlErrorPatterns) {
      if (pattern.test(pageContent || '')) {
        test.fail(true, `SQL error message exposed: ${pattern}`);
      }
    }
  }

  test.describe('SQL Injection - Authentication Bypass Attempts', () => {
    const CRITICAL_SQL_PAYLOADS = SQL_INJECTION_PAYLOADS.filter(
      p => p.severity === 'critical' || p.description.includes('bypass')
    );

    CRITICAL_SQL_PAYLOADS.forEach((payload: SecurityPayload) => {
      test(`Should block SQL injection in EMAIL field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitLoginWithPayload(page, 'email', payload.value);
        await verifyAuthenticationNotBypassed(page);
      });

      test(`Should block SQL injection in PASSWORD field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitLoginWithPayload(page, 'password', payload.value);
        await verifyAuthenticationNotBypassed(page);
      });

      test(`Should block SQL injection in ROLE_CODE field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitLoginWithPayload(page, 'role_code', payload.value);
        await verifyAuthenticationNotBypassed(page);
      });
    });
  });

  test.describe('Authentication Bypass Specific Payloads', () => {
    const AUTH_BYPASS_PAYLOADS = [
      { value: "admin' --", description: 'Admin user with comment' },
      { value: "admin' #", description: 'Admin user with MySQL comment' },
      { value: "admin'/*", description: 'Admin user with inline comment' },
      { value: "' or 1=1--", description: 'Classic OR 1=1' },
      { value: "' or 'a'='a", description: 'Always true condition' },
      { value: "') or ('1'='1", description: 'Parenthesis bypass' },
      { value: "' OR '1'='1' /*", description: 'OR with inline comment' },
      { value: "admin' AND 1=1--", description: 'Admin with AND true' },
      { value: "1' or '1' = '1", description: 'Numeric OR bypass' },
      { value: "' UNION SELECT NULL, 'admin', 'password'--", description: 'Union-based bypass' },
    ];

    AUTH_BYPASS_PAYLOADS.forEach(({ value, description }) => {
      test(`Should block authentication bypass: ${description}`, async ({ page }) => {
        console.log(`Testing auth bypass: ${description}`);

        // Try in email field
        await submitLoginWithPayload(page, 'email', value);
        await verifyAuthenticationNotBypassed(page);

        // Navigate back to login
        await page.goto(LOGIN_URL);
        await page.waitForLoadState('networkidle');

        // Try in password field
        await submitLoginWithPayload(page, 'password', value);
        await verifyAuthenticationNotBypassed(page);
      });
    });
  });

  test.describe('XSS in Login Form', () => {
    XSS_PAYLOADS.forEach((payload: SecurityPayload) => {
      test(`Should block XSS in EMAIL field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        let dialogDetected = false;
        page.on('dialog', async dialog => {
          dialogDetected = true;
          await dialog.dismiss();
        });

        await submitLoginWithPayload(page, 'email', payload.value);
        await page.waitForTimeout(1000);

        expect(dialogDetected).toBe(false);
        await verifyAuthenticationNotBypassed(page);
      });
    });
  });

  test.describe('NoSQL Injection Tests', () => {
    NOSQL_INJECTION_PAYLOADS.forEach((payload: SecurityPayload) => {
      test(`Should block NoSQL injection in EMAIL field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitLoginWithPayload(page, 'email', payload.value);
        await verifyAuthenticationNotBypassed(page);
      });

      test(`Should block NoSQL injection in PASSWORD field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitLoginWithPayload(page, 'password', payload.value);
        await verifyAuthenticationNotBypassed(page);
      });
    });
  });

  test.describe('Password Field Special Tests', () => {
    const PASSWORD_ATTACKS = [
      { value: '', description: 'Empty password' },
      { value: ' ', description: 'Space-only password' },
      { value: 'a'.repeat(10000), description: 'Extremely long password (10k chars)' },
      { value: '\x00\x00\x00', description: 'Null bytes' },
      { value: '%00', description: 'URL-encoded null byte' },
      { value: '${7*7}', description: 'Template injection' },
      { value: '{{7*7}}', description: 'Angular template injection' },
    ];

    PASSWORD_ATTACKS.forEach(({ value, description }) => {
      test(`Should handle password attack: ${description}`, async ({ page }) => {
        console.log(`Testing password: ${description}`);

        await submitLoginWithPayload(page, 'password', value);
        await verifyAuthenticationNotBypassed(page);
      });
    });
  });

  test.describe('Role Code Injection Tests', () => {
    const ROLE_ATTACKS = [
      { value: "super_admin' OR '1'='1", description: 'Role escalation SQL injection' },
      { value: 'root', description: 'Root role attempt' },
      { value: 'administrator', description: 'Administrator role attempt' },
      { value: '../../../etc/passwd', description: 'Path traversal in role' },
      { value: '${7*7}', description: 'Template injection in role' },
    ];

    ROLE_ATTACKS.forEach(({ value, description }) => {
      test(`Should block role attack: ${description}`, async ({ page }) => {
        console.log(`Testing role: ${description}`);

        await submitLoginWithPayload(page, 'role_code', value);
        await verifyAuthenticationNotBypassed(page);
      });
    });
  });

  test.describe('Time-based Attack Detection', () => {
    const TIME_BASED_PAYLOADS = [
      { value: "' OR SLEEP(5)--", description: 'MySQL sleep' },
      { value: "'; WAITFOR DELAY '00:00:05'--", description: 'SQL Server delay' },
      { value: "'; SELECT pg_sleep(5)--", description: 'PostgreSQL sleep' },
    ];

    TIME_BASED_PAYLOADS.forEach(({ value, description }) => {
      test(`Should not delay response for: ${description}`, async ({ page }) => {
        console.log(`Testing time-based SQLi: ${description}`);

        const startTime = Date.now();

        await submitLoginWithPayload(page, 'email', value);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Response should not be delayed by 5 seconds
        // Allow up to 3 seconds for network/processing
        expect(responseTime).toBeLessThan(3000);

        await verifyAuthenticationNotBypassed(page);
      });
    });
  });

  test.describe('Rate Limiting Tests', () => {
    test('Should handle multiple failed login attempts', async ({ page }) => {
      console.log('Testing rate limiting on failed logins');

      // Attempt 10 failed logins rapidly
      for (let i = 0; i < 10; i++) {
        await page.goto(LOGIN_URL);
        await page.waitForLoadState('networkidle');

        await page.fill('input[formControlName="email"]', `attacker${i}@test.com`);
        await page.fill('input[formControlName="password"]', 'WrongPassword123!');
        await page.fill('input[formControlName="role_code"]', 'admin');

        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }

      // After 10 attempts, should still be on login page or show rate limit
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');

      // Check if rate limiting message is shown
      const pageContent = await page.textContent('body');
      const hasRateLimitMessage = /too many|rate limit|try again later|blocked/i.test(pageContent || '');

      console.log(`Rate limiting detected: ${hasRateLimitMessage}`);
    });
  });

  test('Should NOT expose user enumeration', async ({ page }) => {
    console.log('Testing user enumeration protection');

    // Try with non-existent email
    await page.fill('input[formControlName="email"]', 'nonexistent@example.com');
    await page.fill('input[formControlName="password"]', 'SomePassword123!');
    await page.fill('input[formControlName="role_code"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    const errorMessage1 = await page.locator('.alert-danger, .error-message, .text-danger').textContent();

    // Try with another non-existent email
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');

    await page.fill('input[formControlName="email"]', 'another@example.com');
    await page.fill('input[formControlName="password"]', 'WrongPassword!');
    await page.fill('input[formControlName="role_code"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    const errorMessage2 = await page.locator('.alert-danger, .error-message, .text-danger').textContent();

    // Error messages should be generic (not revealing if user exists)
    // They should be similar regardless of whether email exists or password is wrong
    console.log('Error message 1:', errorMessage1);
    console.log('Error message 2:', errorMessage2);

    // Should NOT contain user-specific messages like:
    // "User not found", "Email doesn't exist", "Wrong password for this user"
    const hasUserEnumeration = /user (not found|doesn't exist|does not exist)/i.test(errorMessage1 || '') ||
                               /email (not found|doesn't exist|does not exist)/i.test(errorMessage1 || '');

    expect(hasUserEnumeration).toBe(false);
  });
});
