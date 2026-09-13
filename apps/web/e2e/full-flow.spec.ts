import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'https://enrichly-api-qhj2.onrender.com';
const BASE_URL = process.env.BASE_URL || 'https://enrichly-one.vercel.app';
const DEMO_EMAIL = 'demo@enrichly.dev';
const DEMO_PASS = 'password123';

async function login(page) {
  await page.goto('/login');
  await page.fill('input.input', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASS);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('/', { timeout: 30000 });
}

const PROD_URL = process.env.NEXT_PUBLIC_API_URL || 'https://enrichly-api-qhj2.onrender.com';

test.describe('Full Job Automation Platform - Requirements Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Authentication & Authorization', () => {
    test('Register new user', async ({ page }) => {
      await page.goto('/register');
      const email = `test_${Date.now()}@example.com`;
      await page.fill('input.input', email);
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Register")');
      await page.waitForURL('/', { timeout: 30000 });
    });

    test('Login with demo credentials', async ({ page }) => {
      await login(page);
      await expect(page.locator('text=Total jobs')).toBeVisible({ timeout: 10000 });
    });

    test('Logout works', async ({ page }) => {
      await login(page);
      await page.click('text=Logout');
      await page.waitForURL('/login', { timeout: 10000 });
    });

    test('Protected routes redirect to login', async ({ page }) => {
      await page.goto('/jobs/new');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Job CRUD', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Create a job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Test API Job');
      await page.fill('input[placeholder*="What does"]', 'Test description');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/[a-f0-9-]+/, { timeout: 15000 });
      await expect(page.locator('h1')).toContainText('Test API Job');
    });

    test('Edit a job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Original Name');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Edit');
      await page.waitForTimeout(1000);
      const nameInput = page.locator('input[placeholder*="Sync users"]');
      await nameInput.clear();
      await nameInput.fill('Updated Name');
      await page.click('button:has-text("Save changes")');
      await page.waitForTimeout(3000);
      await expect(page.locator('h1')).toContainText('Updated Name', { timeout: 15000 });
    });

    test('Delete a job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'To Delete');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      page.on('dialog', async dialog => { await dialog.accept(); });
      await page.click('text=Delete');
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL('/', { timeout: 15000 });
    });
  });

  test.describe('Job Scheduling', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Create manual job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Manual Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/[a-f0-9-]+/, { timeout: 15000 });
      await expect(page.locator('text=manual').first()).toBeVisible({ timeout: 10000 });
    });

    test('Create interval job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Interval Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.locator('select').nth(1).selectOption('Interval');
      await page.fill('input[type="number"]', '300');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/[a-f0-9-]+/, { timeout: 15000 });
      await expect(page.locator('text=every 300s')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Run Now & Execution History', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Run now creates execution', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Run Test Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('text=Execution').first()).toBeVisible({ timeout: 10000 });
    });

    test('Run now with flaky endpoint shows retries', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Flaky Test Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/flaky`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('.eyebrow:has-text("Attempts")')).toBeVisible({ timeout: 30000 });
    });

    test('Execution detail shows attempts and logs', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Detail Test Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('.eyebrow:has-text("Attempts")')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.eyebrow:has-text("Logs")')).toBeVisible();
    });
  });

  test.describe('Retry Failed Executions', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Retry button appears on failed execution', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Fail Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/fail`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('.pill:has-text("Failed")').first()).toBeVisible({ timeout: 30000 });
      await expect(page.locator('text=Retry').first()).toBeVisible({ timeout: 10000 });
    });

    test('Retry creates new execution', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Retry Test Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/fail`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('.pill:has-text("Failed")').first()).toBeVisible({ timeout: 30000 });

      await page.click('text=Retry');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('.eyebrow:has-text("Attempts")')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Idempotent Run Now', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Duplicate Run Now clicks are deduplicated', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Idempotent Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      const firstUrl = page.url();
      const execId = firstUrl.split('/executions/')[1];

      const res = await page.request.get(`${API_URL}/api/executions/${execId}`, {
        headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('enrichly_token'))}` }
      });
      const exec = await res.json();
      await page.goto(`/jobs/${exec.jobId}`);
      await page.waitForTimeout(3000);
      await page.locator('text=Run now').first().click({ timeout: 10000 });
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      const secondUrl = page.url();
      expect(firstUrl).toBe(secondUrl);
    });
  });

  test.describe('Cancel Execution', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Cancel running execution', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Slow Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/slow?ms=5000`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('text=Cancel').first()).toBeVisible({ timeout: 10000 });
      await page.click('text=Cancel');
      await expect(page.locator('.pill:has-text("Cancelled")')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Dashboard & Stats', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Dashboard shows stats', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('text=Total jobs')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Active').first()).toBeVisible();
      await expect(page.locator('text=Running').first()).toBeVisible();
    });

    test('Dashboard shows workers section', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.eyebrow:has-text("Workers")').first()).toBeVisible({ timeout: 15000 });
    });

    test('Search and filter jobs', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Searchable Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.goto('/');
      await page.waitForTimeout(3000);
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('Searchable');
      await page.waitForTimeout(2000);
      await expect(page.locator('a:has-text("Searchable Job")')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Notifications / Webhooks', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Job with failed notification shows delivery', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Notify Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/fail`);
      await page.locator('select').nth(2).selectOption('Failed');
      await page.fill('input[placeholder*="hooks.example"]', `${PROD_URL}/api/demo/echo`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('.pill:has-text("Failed")').first()).toBeVisible({ timeout: 30000 });
      await expect(page.locator('text=Notification delivered to')).toBeVisible({ timeout: 45000 });
    });
  });

  test.describe('Real-time Updates (SignalR)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Execution page shows realtime indicator', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Realtime Job');
      await page.fill('input[placeholder*="api.example.com"]', `${PROD_URL}/api/demo/flaky`);
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 15000 });

      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('text=realtime').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Concurrency & Worker Health', () => {
    test('Workers endpoint reports workers', async ({ page }) => {
      await login(page);
      const res = await page.request.get(`${API_URL}/api/workers/health`, {
        headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('enrichly_token'))}` }
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.workers.length).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Responsive Design', () => {
    test('Mobile viewport works', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await login(page);
      await page.goto('/');
      await expect(page.locator('text=Total jobs')).toBeVisible({ timeout: 15000 });
    });

    test('Tablet viewport works', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await login(page);
      await page.goto('/');
      await expect(page.locator('text=Total jobs')).toBeVisible({ timeout: 15000 });
    });
  });
});

test.describe('API Health & Endpoints', () => {
  test('Health endpoint returns healthy', async () => {
    const res = await fetch(`${API_URL}/api/health`);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('up');
    expect(data.worker).toBe('running');
  });

  test('Demo endpoints work', async () => {
    const echo = await fetch(`${API_URL}/api/demo/echo`);
    expect(echo.ok).toBeTruthy();

    const flaky = await fetch(`${API_URL}/api/demo/flaky`);
    expect([200, 503]).toContain(flaky.status);

    const fail = await fetch(`${API_URL}/api/demo/fail`);
    expect(fail.status).toBe(500);
  });
});
