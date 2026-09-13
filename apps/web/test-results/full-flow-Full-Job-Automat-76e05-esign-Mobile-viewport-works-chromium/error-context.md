# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.ts >> Full Job Automation Platform - Requirements Verification >> Responsive Design >> Mobile viewport works
- Location: e2e\full-flow.spec.ts:331:9

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - banner [ref=f1e2]:
    - generic [ref=f1e3]:
      - link "enrichly." [ref=f1e4] [cursor=pointer]:
        - /url: /
      - generic [ref=f1e9]:
        - link "New job" [ref=f1e10] [cursor=pointer]:
          - /url: /jobs/new
        - link "Sign in" [ref=f1e13] [cursor=pointer]:
          - /url: /login
  - main [ref=f1e14]:
    - generic [ref=f1e16]:
      - heading "Welcome back" [level=1] [ref=f1e17]
      - paragraph [ref=f1e18]: Sign in to your automation workspace.
      - generic [ref=f1e19]:
        - generic [ref=f1e20]:
          - generic [ref=f1e21]: Email
          - textbox [ref=f1e22]: demo@enrichly.dev
        - generic [ref=f1e23]:
          - generic [ref=f1e24]: Password
          - textbox [ref=f1e25]: password123
        - button "Sign in" [ref=f1e26] [cursor=pointer]
        - paragraph [ref=f1e29]:
          - text: No account?
          - link "Register" [ref=f1e30] [cursor=pointer]:
            - /url: /register
  - contentinfo [ref=f1e31]:
    - generic [ref=f1e32]:
      - generic [ref=f1e33]: enrichly.
      - generic [ref=f1e34]: Job automation · PostgreSQL is the source of truth · atomic claims · exponential backoff
  - alert [ref=f1e35]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const API_URL = 'http://localhost:5000';
  4   | const DEMO_EMAIL = 'demo@enrichly.dev';
  5   | const DEMO_PASS = 'password123';
  6   | 
  7   | async function login(page) {
  8   |   await page.goto('/login');
> 9   |   await page.fill('input[type="email"]', DEMO_EMAIL);
      |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  10  |   await page.fill('input[type="password"]', DEMO_PASS);
  11  |   await page.click('button:has-text("Sign in")');
  12  |   await expect(page).toHaveURL('/');
  13  | }
  14  | 
  15  | async function apiRequest(endpoint, options = {}) {
  16  |   const res = await fetch(`${API_URL}${endpoint}`, {
  17  |     ...options,
  18  |     headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  19  |   });
  20  |   return { status: res.status, body: await res.json().catch(() => ({})) };
  21  | }
  22  | 
  23  | test.describe('Full Job Automation Platform - Requirements Verification', () => {
  24  |   test.beforeEach(async ({ page }) => {
  25  |     await page.goto('/');
  26  |   });
  27  | 
  28  |   test.describe('Authentication & Authorization', () => {
  29  |     test('Register new user', async ({ page }) => {
  30  |       await page.goto('/register');
  31  |       const email = `test_${Date.now()}@example.com`;
  32  |       await page.fill('input[type="email"]', email);
  33  |       await page.fill('input[type="password"]', 'password123');
  34  |       await page.click('button:has-text("Register")');
  35  |       await expect(page).toHaveURL('/');
  36  |       await expect(page.locator('text=Sign in')).not.toBeVisible();
  37  |     });
  38  | 
  39  |     test('Login with demo credentials', async ({ page }) => {
  40  |       await login(page);
  41  |       await expect(page.locator('text=Dashboard')).toBeVisible();
  42  |     });
  43  | 
  44  |     test('Logout works', async ({ page }) => {
  45  |       await login(page);
  46  |       await page.click('button:has-text("Logout")');
  47  |       await expect(page).toHaveURL('/login');
  48  |     });
  49  | 
  50  |     test('Protected routes redirect to login', async ({ page }) => {
  51  |       await page.goto('/jobs/new');
  52  |       await expect(page).toHaveURL('/login');
  53  |     });
  54  |   });
  55  | 
  56  |   test.describe('Job CRUD', () => {
  57  |     test.beforeEach(async ({ page }) => {
  58  |       await login(page);
  59  |     });
  60  | 
  61  |     test('Create a job', async ({ page }) => {
  62  |       await page.goto('/jobs/new');
  63  |       await page.fill('input[placeholder="Sync users every hour"]', 'Test API Job');
  64  |       await page.fill('input[placeholder="What does this job do?"]', 'Test description');
  65  |       await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
  66  |       await page.click('button:has-text("Create job")');
  67  |       await expect(page.url()).toMatch(/\/jobs\/[a-f0-9-]+/);
  68  |       await expect(page.locator('h1')).toContainText('Test API Job');
  69  |     });
  70  | 
  71  |     test('Edit a job', async ({ page }) => {
  72  |       await page.goto('/jobs/new');
  73  |       await page.fill('input[placeholder="Sync users every hour"]', 'Original Name');
  74  |       await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
  75  |       await page.click('button:has-text("Create job")');
  76  |       await page.waitForURL(/\/jobs\/.*/);
  77  |       
  78  |       await page.click('button:has-text("Edit")');
  79  |       await page.fill('input[placeholder="Sync users every hour"]', 'Updated Name');
  80  |       await page.click('button:has-text("Save changes")');
  81  |       await expect(page.locator('h1')).toContainText('Updated Name');
  82  |     });
  83  | 
  84  |     test('Delete a job', async ({ page }) => {
  85  |       await page.goto('/jobs/new');
  86  |       await page.fill('input[placeholder="Sync users every hour"]', 'To Delete');
  87  |       await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
  88  |       await page.click('button:has-text("Create job")');
  89  |       await page.waitForURL(/\/jobs\/.*/);
  90  |       
  91  |       page.on('dialog', dialog => dialog.accept());
  92  |       await page.click('button:has-text("Delete")');
  93  |       await expect(page).toHaveURL('/');
  94  |     });
  95  |   });
  96  | 
  97  |   test.describe('Job Scheduling', () => {
  98  |     test.beforeEach(async ({ page }) => {
  99  |       await login(page);
  100 |     });
  101 | 
  102 |     test('Create manual job', async ({ page }) => {
  103 |       await page.goto('/jobs/new');
  104 |       await page.fill('input[placeholder="Sync users every hour"]', 'Manual Job');
  105 |       await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
  106 |       await page.selectOption('select >> nth=0', 'Manual');
  107 |       await page.click('button:has-text("Create job")');
  108 |       await expect(page.locator('text=manual')).toBeVisible();
  109 |     });
```