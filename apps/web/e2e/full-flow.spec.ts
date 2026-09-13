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

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

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
      await expect(page.locator('text=Sign in')).not.toBeVisible();
    });

    test('Login with demo credentials', async ({ page }) => {
      await login(page);
      await expect(page.locator('text=Total jobs')).toBeVisible({ timeout: 10000 });
    });

    test('Logout works', async ({ page }) => {
      await login(page);
      await page.click('button:has-text("Logout")');
      await expect(page).toHaveURL('/login');
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
      await page.fill('input[placeholder="Sync users every hour"]', 'Test API Job');
      await page.fill('input[placeholder="What does this job do?"]', 'Test description');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
      await page.click('button:has-text("Create job")');
      await expect(page.url()).toMatch(/\/jobs\/[a-f0-9-]+/);
      await expect(page.locator('h1')).toContainText('Test API Job');
    });

    test('Edit a job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Original Name');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/);
      
      await page.click('button:has-text("Edit")');
      await page.fill('input[placeholder="Sync users every hour"]', 'Updated Name');
      await page.click('button:has-text("Save changes")');
      await expect(page.locator('h1')).toContainText('Updated Name');
    });

    test('Delete a job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'To Delete');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/);
      
      page.on('dialog', dialog => dialog.accept());
      await page.click('button:has-text("Delete")');
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Job Scheduling', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Create manual job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Manual Job');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
      await page.selectOption('select >> nth=0', 'Manual');
      await page.click('button:has-text("Create job")');
      await expect(page.locator('text=manual')).toBeVisible();
    });

    test('Create interval job', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Interval Job');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
      await page.selectOption('select >> nth=0', 'Interval');
      await page.fill('input[type="number"] >> nth=0', '300');
      await page.click('button:has-text("Create job")');
      await expect(page.locator('text=every 300s')).toBeVisible();
    });
  });

  test.describe('Run Now & Execution History', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Run now creates execution', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Run Test Job');
      await page.fill('input[placeholder*="api.example.com"]', 'http://api:8080/api/demo/echo');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 30000 });
      
      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('text=Execution').first()).toBeVisible({ timeout: 10000 });
    });

    test('Run now with flaky endpoint shows retries', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Flaky Test Job');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/flaky');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/);
      
      await page.click('button:has-text("Run now")');
      await page.waitForURL(/\/executions\/.*/);
      await expect(page.locator('text=Attempt')).toBeVisible({ timeout: 20000 });
    });

    test('Execution detail shows attempts and logs', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Detail Test Job');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/);
      
      await page.click('button:has-text("Run now")');
      await page.waitForURL(/\/executions\/.*/);
      await expect(page.locator('text=Attempts')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Logs')).toBeVisible();
    });
  });

  test.describe('Retry Failed Executions', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Retry button appears on failed execution', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Fail Job');
      await page.fill('input[placeholder*="api.example.com"]', 'http://api:8080/api/demo/fail');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 30000 });
      
      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('text=Failed').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Retry').first()).toBeVisible({ timeout: 15000 });
    });

    test('Retry creates new execution', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder*="Sync users"]', 'Retry Test Job');
      await page.fill('input[placeholder*="api.example.com"]', 'http://api:8080/api/demo/fail');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 30000 });
      
      await page.waitForTimeout(2000);
      await page.click('text=Run now');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('text=Failed').first()).toBeVisible({ timeout: 15000 });
      
      await page.click('text=Retry');
      await page.waitForURL(/\/executions\/.*/, { timeout: 30000 });
      await expect(page.locator('text=Execution').first()).toBeVisible();
    });
  });

  test.describe('Idempotent Run Now', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Duplicate Run Now clicks are deduplicated', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Idempotent Job');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/echo');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/);
      
      await page.click('button:has-text("Run now")');
      await page.waitForURL(/\/executions\/.*/);
      const firstExecutionUrl = page.url();
      
      // Go back to job page and run again
      await page.goto(firstExecutionUrl.replace('/executions/', '/jobs/'));
      await page.click('button:has-text("Run now")');
      await page.waitForURL(/\/executions\/.*/);
      const secondExecutionUrl = page.url();
      
      expect(firstExecutionUrl).toBe(secondExecutionUrl);
    });
  });

  test.describe('Cancel Execution', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Cancel running execution', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Slow Job');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/slow?ms=5000');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/);
      
      await page.click('button:has-text("Run now")');
      await page.waitForURL(/\/executions\/.*/);
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('text=Cancelled')).toBeVisible({ timeout: 10000 });
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
      await page.fill('input[placeholder*="api.example.com"]', 'http://api:8080/api/demo/echo');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/, { timeout: 30000 });
      
      await page.goto('/');
      await page.fill('input[placeholder*="Search"]', 'Searchable');
      await expect(page.locator('text=Searchable Job')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Notifications / Webhooks', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Job with failed notification shows delivery', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Notify Job');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/fail');
      await page.selectOption('select >> nth=2', 'Failed');
      await page.fill('input[placeholder="https://hooks.example.com/enrichly"]', 'http://api:8080/api/demo/echo');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/);
      
      await page.click('button:has-text("Run now")');
      await page.waitForURL(/\/executions\/.*/);
      await expect(page.locator('text=Failed').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Notification delivered')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Real-time Updates (SignalR)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Execution page shows realtime indicator', async ({ page }) => {
      await page.goto('/jobs/new');
      await page.fill('input[placeholder="Sync users every hour"]', 'Realtime Job');
      await page.fill('input[placeholder="https://api.example.com/webhook"]', 'http://api:8080/api/demo/flaky');
      await page.click('button:has-text("Create job")');
      await page.waitForURL(/\/jobs\/.*/);
      
      await page.click('button:has-text("Run now")');
      await page.waitForURL(/\/executions\/.*/);
      await expect(page.locator('text=realtime')).toBeVisible({ timeout: 10000 });
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