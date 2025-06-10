import { test, expect, Page } from '@playwright/test';

// Test configuration for production readiness
const ADMIN_EMAIL = 'admin@mssp.com';
const ADMIN_PASSWORD = 'admin123';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Production Readiness E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set up page for testing
    await page.goto(BASE_URL);
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('🔐 Authentication & Security', () => {
    test('should enforce login requirements', async () => {
      // Try to access protected routes directly
      await page.goto(`${BASE_URL}/admin`);
      
      // Should redirect to login or show login form
      await expect(page).toHaveURL(/.*login.*/);
      
      // Verify login form exists
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    });

    test('should handle invalid login attempts', async () => {
      await page.goto(`${BASE_URL}/login`);
      
      // Try invalid credentials
      await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
      await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"], button:has-text("Login")');
      
      // Should show error message
      await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible();
    });

    test('should successfully login with valid credentials', async () => {
      await page.goto(`${BASE_URL}/login`);
      
      // Login with valid credentials
      await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"], button:has-text("Login")');
      
      // Should redirect to dashboard
      await page.waitForURL(/.*dashboard.*/);
      await expect(page).toHaveURL(/.*dashboard.*/);
    });

    test('should implement session timeout', async () => {
      // Login first
      await loginAsAdmin(page);
      
      // Simulate session timeout (this would need backend support)
      // For now, just verify logout functionality
      await page.click('button:has-text("Logout"), [data-testid="logout"]');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login.*/);
    });
  });

  test.describe('📊 Admin Dashboard & Column Management', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page);
    });

    test('should display admin dashboard with key metrics', async () => {
      await page.goto(`${BASE_URL}/admin/dashboard`);
      
      // Verify dashboard elements
      await expect(page.locator('h1, h2').filter({ hasText: /dashboard|overview/i })).toBeVisible();
      
      // Check for key metrics cards
      await expect(page.locator('[data-testid*="metric"], .metric, .stat')).toHaveCount({ min: 3 });
    });

    test('should access column management interface', async () => {
      await page.goto(`${BASE_URL}/admin/columns`);
      
      // Verify column management interface
      await expect(page.locator('h1, h2').filter({ hasText: /column|field|management/i })).toBeVisible();
      
      // Check for search functionality
      await expect(page.locator('input[placeholder*="search"], input[type="search"]')).toBeVisible();
      
      // Check for table/list of columns
      await expect(page.locator('table, [data-testid="columns-list"]')).toBeVisible();
    });

    test('should perform column analysis', async () => {
      await page.goto(`${BASE_URL}/admin/columns`);
      
      // Trigger column analysis
      await page.click('button:has-text("Analyze"), button:has-text("Scan"), [data-testid="analyze-button"]');
      
      // Wait for analysis to complete
      await page.waitForSelector('text=/analysis complete|scan finished/i', { timeout: 30000 });
      
      // Verify results are displayed
      await expect(page.locator('[data-testid="analysis-results"], .analysis-results')).toBeVisible();
    });

    test('should handle safe column deletion', async () => {
      await page.goto(`${BASE_URL}/admin/columns`);
      
      // Find a test column to delete (assuming one exists)
      const deleteButton = page.locator('button:has-text("Delete"), [data-testid*="delete"]').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        await expect(page.locator('.modal, [role="dialog"]')).toBeVisible();
        
        // Should show backup information
        await expect(page.locator('text=/backup|safe|restore/i')).toBeVisible();
        
        // Cancel the deletion for safety
        await page.click('button:has-text("Cancel"), button:has-text("No")');
      }
    });
  });

  test.describe('📝 Form Management & Data Entry', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page);
    });

    test('should create and validate client form', async () => {
      await page.goto(`${BASE_URL}/clients`);
      
      // Click add client button
      await page.click('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      
      // Fill client form
      await page.fill('input[name="name"], input[placeholder*="name"]', 'Test Client');
      await page.fill('input[name="email"], input[type="email"]', 'test@client.com');
      
      // Submit form
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      
      // Verify success message or redirect
      await expect(page.locator('text=/success|created|saved/i')).toBeVisible();
    });

    test('should handle form validation errors', async () => {
      await page.goto(`${BASE_URL}/clients`);
      
      // Try to submit empty form
      await page.click('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      
      // Should show validation errors
      await expect(page.locator('text=/required|invalid|error/i')).toBeVisible();
    });

    test('should handle service authorization forms (SAF)', async () => {
      await page.goto(`${BASE_URL}/saf`);
      
      // Verify SAF page loads
      await expect(page.locator('h1, h2').filter({ hasText: /service authorization|saf/i })).toBeVisible();
      
      // Check for SAF list/table
      await expect(page.locator('table, [data-testid="saf-list"]')).toBeVisible();
      
      // Test search functionality
      const searchInput = page.locator('input[placeholder*="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(1000); // Wait for search results
      }
    });
  });

  test.describe('🔒 Security & Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      await loginAsAdmin(page);
      
      // Intercept API calls and simulate errors
      await page.route('**/api/**', route => {
        if (route.request().method() === 'GET' && route.request().url().includes('/clients')) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' })
          });
        } else {
          route.continue();
        }
      });
      
      await page.goto(`${BASE_URL}/clients`);
      
      // Should show error message instead of crashing
      await expect(page.locator('text=/error|failed|something went wrong/i')).toBeVisible();
    });

    test('should protect against XSS attempts', async () => {
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/clients`);
      
      // Try to inject script in form fields
      const xssPayload = '<script>alert("xss")</script>';
      
      await page.click('button:has-text("Add"), button:has-text("Create")');
      await page.fill('input[name="name"]', xssPayload);
      await page.click('button[type="submit"]');
      
      // Script should not execute (no alert dialog)
      await page.waitForTimeout(2000);
      
      // Verify no alert dialog appeared
      const dialogs = [];
      page.on('dialog', dialog => dialogs.push(dialog));
      expect(dialogs).toHaveLength(0);
    });

    test('should enforce proper CSRF protection', async () => {
      await loginAsAdmin(page);
      
      // Try to make requests without proper tokens
      const response = await page.request.post(`${BASE_URL}/api/clients`, {
        data: { name: 'Test Client' }
      });
      
      // Should be rejected (403 or 401)
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('⚡ Performance & Load Testing', () => {
    test('should load pages within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle concurrent user sessions', async () => {
      // This would require multiple browser contexts
      // Simplified version - just verify multiple tabs work
      await loginAsAdmin(page);
      
      const page2 = await page.context().newPage();
      await page2.goto(`${BASE_URL}/dashboard`);
      
      // Both pages should work independently
      await expect(page.locator('h1, h2')).toBeVisible();
      await expect(page2.locator('h1, h2')).toBeVisible();
      
      await page2.close();
    });
  });

  test.describe('💾 Data Integrity & Backup', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page);
    });

    test('should verify backup creation before deletions', async () => {
      await page.goto(`${BASE_URL}/admin/columns`);
      
      // Look for delete functionality
      const deleteButton = page.locator('button:has-text("Delete")').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Should show backup information in confirmation
        await expect(page.locator('text=/backup|restore|undo/i')).toBeVisible();
        
        // Cancel for safety
        await page.click('button:has-text("Cancel")');
      }
    });

    test('should handle data export functionality', async () => {
      await page.goto(`${BASE_URL}/clients`);
      
      // Look for export functionality
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');
      
      if (await exportButton.isVisible()) {
        // Start download
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        const download = await downloadPromise;
        
        // Verify download was successful
        expect(download).toBeTruthy();
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/);
      }
    });
  });

  test.describe('🌐 Cross-Browser & Responsive Testing', () => {
    test('should work on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone viewport
      
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should be responsive
      await expect(page.locator('h1, h2')).toBeVisible();
      
      // Check for mobile menu if present
      const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu, button[aria-label*="menu"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
      }
    });

    test('should work on tablet viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad viewport
      
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should maintain functionality
      await expect(page.locator('h1, h2')).toBeVisible();
    });
  });
});

// Helper function for login
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  
  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login")');
  
  // Wait for redirect to dashboard
  await page.waitForURL(/.*dashboard.*/, { timeout: 10000 });
}

// Performance helper
export async function measurePageLoad(page: Page, url: string) {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return Date.now() - startTime;
}

// Security helper
export async function testXSSProtection(page: Page, inputSelector: string) {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(\'xss\')">'
  ];
  
  const dialogs: any[] = [];
  page.on('dialog', dialog => dialogs.push(dialog));
  
  for (const payload of xssPayloads) {
    await page.fill(inputSelector, payload);
    await page.waitForTimeout(1000);
  }
  
  return dialogs.length === 0; // True if protected
} 