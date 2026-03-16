import { test, expect, request } from '@playwright/test';

test.describe('Security & Legal Smoke Audit', () => {
  test('Ensure security headers are present on /', async ({ request }) => {
    const response = await request.get('https://delqhi.com');
    const headers = response.headers();
    
    // Modern security headers
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('DACH Legal links must exist and return 200', async ({ request }) => {
    const urls = ['/impressum', '/datenschutz', '/agb', '/widerrufsrecht'];
    
    for (const u of urls) {
      const res = await request.get('https://delqhi.com' + u);
      expect(res.status()).toBe(200);
    }
  });
});
