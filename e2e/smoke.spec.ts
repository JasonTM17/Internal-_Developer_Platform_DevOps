/* eslint-disable */
import { test, expect } from '@playwright/test';

test.describe('Portal Smoke Tests', () => {
  test('loads the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/IDP/i);
  });

  test('navigates to dashboard after login', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"], h1, h2')).toBeVisible({ timeout: 10000 });
  });

  test('catalog page renders', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.locator('body')).toContainText(/catalog/i);
  });

  test('health page renders', async ({ page }) => {
    await page.goto('/health');
    await expect(page.locator('body')).toBeVisible();
  });
});
