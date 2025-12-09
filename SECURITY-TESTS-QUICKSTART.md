# Security Tests - Quick Start Guide

## 🚀 Run Tests (Choose One)

### Option 1: Quick Test (Recommended for First Time)
```bash
npm run test:security:contact
```

### Option 2: All Security Tests
```bash
npm run test:security
```

### Option 3: Full Suite with Report
```bash
npm run test:security:full
```

---

## 📋 Prerequisites

1. **Backend running** on `http://localhost:8000`
   ```bash
   cd ../document-uploader-backend
   php artisan serve
   ```

2. **Dependencies installed**
   ```bash
   npm install
   ```

---

## 🧪 What Gets Tested

### Forms
- ✅ Contact Us page (6 fields)
- ✅ Login page (3 fields)

### Attack Types (67+ payloads)
- ✅ **SQL Injection** (10 payloads) - `' OR 1=1--`, `UNION SELECT`, etc.
- ✅ **XSS** (10 payloads) - `<script>alert()</script>`, etc.
- ✅ **Command Injection** (5 payloads) - `; ls`, `| cat /etc/passwd`
- ✅ **Path Traversal** (5 payloads) - `../../../etc/passwd`
- ✅ **Authentication Bypass** (10 payloads)
- ✅ **NoSQL Injection** (3 payloads)
- ✅ **LDAP, XML, Special chars** (24 payloads)

---

## 📊 Understanding Results

### ✅ PASS = Good
- Backend blocked the attack
- No sensitive errors exposed
- Form handled malicious input safely

### ❌ FAIL = Investigate
- Check screenshots in `test-results/`
- Review backend logs
- Verify input validation
- Check for SQL errors exposed

---

## 🎯 Common Commands

```bash
# Contact form only
npm run test:security:contact

# Login form only
npm run test:security:login

# All tests
npm run test:security

# With interactive UI
npm run test:security:ui

# View last report
npm run test:security:report
```

---

## 🐛 Troubleshooting

### "Backend not running"
```bash
cd ../document-uploader-backend
php artisan serve
```

### "Browser not found"
```bash
npx playwright install chromium
```

### "Permission denied"
```bash
chmod +x ./scripts/run-security-tests.sh
```

---

## 📁 Files Created

- `e2e/security-tests/contact-form.security.spec.ts` - Contact tests
- `e2e/security-tests/login-form.security.spec.ts` - Login tests
- `e2e/security-tests/payloads/injection-payloads.ts` - 67+ attack payloads
- `playwright.config.ts` - Playwright configuration
- `scripts/run-security-tests.sh` - Bash test runner
- `SECURITY-TESTING.md` - Full documentation

---

## 📈 Test Coverage

| Form Field | SQL | XSS | Cmd | Path | Total Tests |
|------------|-----|-----|-----|------|-------------|
| Contact: Name | ✅ 10 | ✅ 10 | ✅ 5 | ❌ | 25+ |
| Contact: Email | ✅ 4 | ❌ | ❌ | ❌ | 4 |
| Contact: Subject | ✅ 10 | ❌ | ❌ | ❌ | 10 |
| Contact: Message | ✅ 10 | ✅ 10 | ❌ | ✅ 5 | 25+ |
| Contact: Phone | ✅ 3 | ❌ | ❌ | ❌ | 3 |
| Contact: Residence | ✅ 10 | ❌ | ❌ | ❌ | 10 |
| Login: Email | ✅ 10 | ✅ 10 | ❌ | ❌ | 20+ |
| Login: Password | ✅ 10 | ❌ | ❌ | ❌ | 18+ |
| Login: Role | ✅ 5 | ❌ | ❌ | ❌ | 5 |

**Total: 120+ security tests**

---

## ⏱️ Run Schedule

Recommended testing frequency:
- 🔴 **Before deployment**: ALWAYS
- 🟡 **After code changes**: Run affected form tests
- 🟢 **Weekly**: Full test suite
- 🔵 **Daily (CI/CD)**: Automated runs

---

## 🔗 Next Steps

1. ✅ Run your first test: `npm run test:security:contact`
2. 📖 Read full docs: `SECURITY-TESTING.md`
3. 🔧 Set up CI/CD automation
4. 🛡️ Add tests for new forms
5. 📊 Review results regularly

---

## 💡 Pro Tips

1. **Start small**: Test one form first
2. **Review failures**: Don't just look at pass/fail count
3. **Check screenshots**: Visual proof of what happened
4. **Update payloads**: Keep attack library current
5. **Test regularly**: Security is ongoing, not one-time

---

**Need Help?** See `SECURITY-TESTING.md` for detailed documentation.
