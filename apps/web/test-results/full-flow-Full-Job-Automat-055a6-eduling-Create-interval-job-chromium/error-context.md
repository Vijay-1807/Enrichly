# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.ts >> Full Job Automation Platform - Requirements Verification >> Job Scheduling >> Create interval job
- Location: e2e\full-flow.spec.ts:111:9

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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
      - link "enrichly.job automation" [ref=f1e4] [cursor=pointer]:
        - /url: /
      - navigation [ref=f1e9]:
        - link "Overview" [ref=f1e10] [cursor=pointer]:
          - /url: /
        - link "New job" [ref=f1e11] [cursor=pointer]:
          - /url: /jobs/new
      - generic [ref=f1e12]:
        - generic [ref=f1e13]: Open for runs
        - link "New job" [ref=f1e15] [cursor=pointer]:
          - /url: /jobs/new
        - link "Sign in" [ref=f1e18] [cursor=pointer]:
          - /url: /login
    - generic [ref=f1e20]:
      - generic [ref=f1e21]:
        - generic [ref=f1e22]: HTTP jobs
        - generic [ref=f1e23]: +
      - generic [ref=f1e24]:
        - generic [ref=f1e25]: Interval scheduler
        - generic [ref=f1e26]: +
      - generic [ref=f1e27]:
        - generic [ref=f1e28]: Parallel workers
        - generic [ref=f1e29]: +
      - generic [ref=f1e30]:
        - generic [ref=f1e31]: Smart retries
        - generic [ref=f1e32]: +
      - generic [ref=f1e33]: Full history
  - main [ref=f1e35]:
    - generic [ref=f1e36]:
      - generic [ref=f1e37]:
        - generic [ref=f1e41]:
          - paragraph [ref=f1e42]: Automate the boring.Observe everything.
          - paragraph [ref=f1e43]: Jobs, workers, retries and full execution history — in one connected platform.
        - paragraph [ref=f1e44]: enrichly · job automation
      - generic [ref=f1e45]:
        - heading "Welcome back" [level=1] [ref=f1e46]
        - paragraph [ref=f1e47]: Sign in to your automation workspace.
        - generic [ref=f1e48]:
          - generic [ref=f1e49]:
            - generic [ref=f1e50]: Email
            - textbox [ref=f1e51]: demo@enrichly.dev
          - generic [ref=f1e52]:
            - generic [ref=f1e53]: Password
            - textbox [ref=f1e54]: password123
          - button "Sign in" [ref=f1e55] [cursor=pointer]
          - paragraph [ref=f1e58]:
            - text: No account?
            - link "Register" [ref=f1e59] [cursor=pointer]:
              - /url: /register
  - contentinfo [ref=f1e60]:
    - generic [ref=f1e61]:
      - generic [ref=f1e62]: enrichly.
      - generic [ref=f1e63]: Job automation · PostgreSQL is the source of truth · atomic claims · exponential backoff
  - alert [ref=f1e64]
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