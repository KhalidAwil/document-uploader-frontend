import { test, expect, Page } from '@playwright/test';
import {
  SQL_INJECTION_PAYLOADS,
  XSS_PAYLOADS,
  COMMAND_INJECTION_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SPECIAL_CHARACTER_PAYLOADS,
  getCriticalPayloads,
  SecurityPayload
} from './payloads/injection-payloads';

/**
 * Security Tests for Contact Us Form
 * Tests for SQL injection, XSS, and other vulnerabilities
 */

test.describe('Contact Form Security Tests', () => {
  const CONTACT_FORM_URL = '/contact';

  // Valid test data for form submission
  const VALID_FORM_DATA = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    subject: 'Test Subject',
    current_residence: 'Test City',
    message: 'This is a test message for security testing purposes.'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to contact form before each test
    await page.goto(CONTACT_FORM_URL);
    await page.waitForLoadState('networkidle');
  });

  /**
   * Helper function to fill and submit form with injection payload
   */
  async function submitFormWithPayload(
    page: Page,
    fieldName: keyof typeof VALID_FORM_DATA,
    payload: string
  ): Promise<void> {
    // Fill all fields with valid data except the test field
    await page.fill('input[formControlName="name"]',
      fieldName === 'name' ? payload : VALID_FORM_DATA.name);
    await page.fill('input[formControlName="email"]',
      fieldName === 'email' ? payload : VALID_FORM_DATA.email);
    await page.fill('input[formControlName="phone"]',
      fieldName === 'phone' ? payload : VALID_FORM_DATA.phone);
    await page.fill('input[formControlName="subject"]',
      fieldName === 'subject' ? payload : VALID_FORM_DATA.subject);
    await page.fill('input[formControlName="current_residence"]',
      fieldName === 'current_residence' ? payload : VALID_FORM_DATA.current_residence);
    await page.fill('textarea[formControlName="message"]',
      fieldName === 'message' ? payload : VALID_FORM_DATA.message);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(1000);
  }

  /**
   * Helper to verify backend handled injection safely
   */
  async function verifyNoInjectionSuccess(page: Page): Promise<void> {
    // Check that no XSS was executed (no alert dialogs)
    page.on('dialog', dialog => {
      test.fail(true, `XSS Alert detected: ${dialog.message()}`);
    });

    // Verify no SQL error messages are displayed
    const pageContent = await page.textContent('body');
    const sqlErrorPatterns = [
      /SQL syntax/i,
      /mysql_fetch/i,
      /ORA-\d+/i,
      /PostgreSQL/i,
      /sqlite/i,
      /SQLSTATE/i,
      /database error/i,
      /query failed/i,
    ];

    for (const pattern of sqlErrorPatterns) {
      if (pattern.test(pageContent || '')) {
        test.fail(true, `SQL error message detected: ${pattern}`);
      }
    }

    // Verify no command execution output
    const cmdOutputPatterns = [
      /root:x:0:0/,  // /etc/passwd content
      /uid=\d+/,      // whoami output
      /drwx/,         // ls output
    ];

    for (const pattern of cmdOutputPatterns) {
      if (pattern.test(pageContent || '')) {
        test.fail(true, `Command execution output detected: ${pattern}`);
      }
    }
  }

  test.describe('SQL Injection Tests', () => {
    SQL_INJECTION_PAYLOADS.forEach((payload: SecurityPayload) => {
      test(`Should block SQL injection in NAME field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitFormWithPayload(page, 'name', payload.value);
        await verifyNoInjectionSuccess(page);

        // Verify form either shows validation error or success
        const hasError = await page.locator('.alert-danger, .error-message').count() > 0;
        const hasSuccess = await page.locator('.alert-success, .success-message').count() > 0;

        expect(hasError || hasSuccess).toBeTruthy();
      });

      test(`Should block SQL injection in SUBJECT field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitFormWithPayload(page, 'subject', payload.value);
        await verifyNoInjectionSuccess(page);

        const hasError = await page.locator('.alert-danger, .error-message').count() > 0;
        const hasSuccess = await page.locator('.alert-success, .success-message').count() > 0;

        expect(hasError || hasSuccess).toBeTruthy();
      });

      test(`Should block SQL injection in MESSAGE field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitFormWithPayload(page, 'message', payload.value);
        await verifyNoInjectionSuccess(page);

        const hasError = await page.locator('.alert-danger, .error-message').count() > 0;
        const hasSuccess = await page.locator('.alert-success, .success-message').count() > 0;

        expect(hasError || hasSuccess).toBeTruthy();
      });

      test(`Should block SQL injection in CURRENT_RESIDENCE field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitFormWithPayload(page, 'current_residence', payload.value);
        await verifyNoInjectionSuccess(page);

        const hasError = await page.locator('.alert-danger, .error-message').count() > 0;
        const hasSuccess = await page.locator('.alert-success, .success-message').count() > 0;

        expect(hasError || hasSuccess).toBeTruthy();
      });
    });
  });

  test.describe('XSS (Cross-Site Scripting) Tests', () => {
    XSS_PAYLOADS.forEach((payload: SecurityPayload) => {
      test(`Should block XSS in NAME field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        // Listen for dialog events (alerts)
        let dialogDetected = false;
        page.on('dialog', async dialog => {
          dialogDetected = true;
          await dialog.dismiss();
        });

        await submitFormWithPayload(page, 'name', payload.value);

        // Wait a bit for any potential XSS execution
        await page.waitForTimeout(1000);

        // Verify no XSS was executed
        expect(dialogDetected).toBe(false);

        await verifyNoInjectionSuccess(page);
      });

      test(`Should block XSS in MESSAGE field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        let dialogDetected = false;
        page.on('dialog', async dialog => {
          dialogDetected = true;
          await dialog.dismiss();
        });

        await submitFormWithPayload(page, 'message', payload.value);
        await page.waitForTimeout(1000);

        expect(dialogDetected).toBe(false);
        await verifyNoInjectionSuccess(page);
      });
    });
  });

  test.describe('Command Injection Tests', () => {
    COMMAND_INJECTION_PAYLOADS.forEach((payload: SecurityPayload) => {
      test(`Should block command injection in NAME field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitFormWithPayload(page, 'name', payload.value);
        await verifyNoInjectionSuccess(page);

        const hasError = await page.locator('.alert-danger, .error-message').count() > 0;
        const hasSuccess = await page.locator('.alert-success, .success-message').count() > 0;

        expect(hasError || hasSuccess).toBeTruthy();
      });
    });
  });

  test.describe('Path Traversal Tests', () => {
    PATH_TRAVERSAL_PAYLOADS.forEach((payload: SecurityPayload) => {
      test(`Should block path traversal in MESSAGE field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitFormWithPayload(page, 'message', payload.value);
        await verifyNoInjectionSuccess(page);

        const hasError = await page.locator('.alert-danger, .error-message').count() > 0;
        const hasSuccess = await page.locator('.alert-success, .success-message').count() > 0;

        expect(hasError || hasSuccess).toBeTruthy();
      });
    });
  });

  test.describe('Special Characters and Edge Cases', () => {
    SPECIAL_CHARACTER_PAYLOADS.forEach((payload: SecurityPayload) => {
      test(`Should handle special characters in MESSAGE field: ${payload.name}`, async ({ page }) => {
        console.log(`Testing: ${payload.name} - ${payload.description}`);

        await submitFormWithPayload(page, 'message', payload.value);
        await verifyNoInjectionSuccess(page);

        const hasError = await page.locator('.alert-danger, .error-message').count() > 0;
        const hasSuccess = await page.locator('.alert-success, .success-message').count() > 0;

        expect(hasError || hasSuccess).toBeTruthy();
      });
    });
  });

  test.describe('Email Validation Tests', () => {
    const MALICIOUS_EMAILS = [
      { email: "'; DROP TABLE users--@example.com", description: 'SQL injection in email' },
      { email: '<script>alert("XSS")</script>@example.com', description: 'XSS in email' },
      { email: 'admin@localhost', description: 'Internal hostname' },
      { email: '../../../etc/passwd@example.com', description: 'Path traversal in email' },
    ];

    MALICIOUS_EMAILS.forEach(({ email, description }) => {
      test(`Should validate/reject malicious email: ${description}`, async ({ page }) => {
        console.log(`Testing email: ${email}`);

        await submitFormWithPayload(page, 'email', email);
        await verifyNoInjectionSuccess(page);

        // Should either show validation error or safely handle
        const hasValidationError = await page.locator('.alert-danger, .error-message, .invalid-feedback').count() > 0;
        const hasSuccess = await page.locator('.alert-success, .success-message').count() > 0;

        expect(hasValidationError || hasSuccess).toBeTruthy();
      });
    });
  });

  test.describe('Phone Number Validation Tests', () => {
    const MALICIOUS_PHONES = [
      { phone: "'; DROP TABLE users--", description: 'SQL injection in phone' },
      { phone: '<script>alert("XSS")</script>', description: 'XSS in phone' },
      { phone: '`whoami`', description: 'Command injection in phone' },
    ];

    MALICIOUS_PHONES.forEach(({ phone, description }) => {
      test(`Should validate/reject malicious phone: ${description}`, async ({ page }) => {
        console.log(`Testing phone: ${phone}`);

        await submitFormWithPayload(page, 'phone', phone);

        // Should show validation error (phone has pattern validation)
        const hasValidationError = await page.locator('.alert-danger, .error-message, .invalid-feedback').count() > 0;

        expect(hasValidationError).toBeTruthy();
      });
    });
  });

  test('Should successfully submit valid form data', async ({ page }) => {
    // Baseline test: valid data should work
    await submitFormWithPayload(page, 'name', VALID_FORM_DATA.name);

    // Wait for response
    await page.waitForTimeout(2000);

    // Check for success or error message
    const hasMessage = await page.locator('.alert, .message').count() > 0;
    expect(hasMessage).toBeTruthy();
  });
});
