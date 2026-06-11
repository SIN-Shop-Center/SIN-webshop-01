// Purpose: Cloudflare Worker storefront stub - serves legal pages, proxies API, health check
// Docs: worker.doc.md

import {
  STOREFRONT_LEGAL_LINKS,
  STOREFRONT_LEGAL_PAGES,
  STOREFRONT_FOOTER_LEGAL_NOTE,
} from '../../config/storefront-legal';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // ── Health Check ──────────────────────────────────────
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        ok: true, 
        service: 'simone-worldbest-shop', 
        buildDate: new Date().toISOString() 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // ── API Proxy ─────────────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      const apiBase = env.API_BASE_URL || 'http://localhost:8080';
      const apiUrl = new URL(url.pathname + url.search, apiBase);
      const apiRequest = new Request(apiUrl, request);
      return fetch(apiRequest);
    }
    
    // ── Legal Pages ───────────────────────────────────────
    // Serve legal pages from shared config
    for (const [key, page] of Object.entries(STOREFRONT_LEGAL_PAGES)) {
      if (url.pathname === page.path) {
        const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} | SIN_WEBSHOP</title>
  <meta name="description" content="${page.description}">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; }
    h1 { color: #ea580c; font-size: 1.5rem; margin-bottom: 1rem; }
    h2 { color: #444; margin-top: 2rem; font-size: 1.25rem; }
    pre { white-space: pre-wrap; background: #f5f5f5; padding: 1rem; border-radius: 8px; font-size: 0.875rem; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.875rem; color: #666; }
    nav { margin-top: 0.5rem; }
    nav a { margin-right: 1rem; color: #ea580c; text-decoration: none; }
    nav a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${page.title}</h1>
  <p>${page.intro}</p>
  ${page.sections ? page.sections.map(s => `
    <h2>${s.title}</h2>
    <pre>${s.body}</pre>
  `).join('') : ''}
  <footer>
    <p>${STOREFRONT_FOOTER_LEGAL_NOTE}</p>
    <nav>
      ${STOREFRONT_LEGAL_LINKS.map(link => `<a href="${link.href}">${link.label}</a>`).join('')}
    </nav>
  </footer>
</body>
</html>`;
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }
    
    // ── Local Dev: Proxy to Vite Dev Server ───────────────
    const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (isLocalDev) {
      const viteUrl = new URL(url.pathname + url.search, 'http://localhost:5173');
      const viteRequest = new Request(viteUrl, request);
      return fetch(viteRequest);
    }
    
    // ── Production: Placeholder ───────────────────────────
    // TODO: Implement static file serving from apps/web/dist
    // using Workers Sites or KV asset handler
    return new Response('SIN_WEBSHOP Storefront - Coming Soon', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
