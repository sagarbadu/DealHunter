import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { ScavioClient } from './scavioClient.mjs';
import { mapShoppingProductResponse, mapShoppingResponse } from './scavioMapper.mjs';

function loadLocalEnv() {
  try {
    const contents = readFileSync(new URL('./.env', import.meta.url), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // Environment variables can be supplied by the host instead.
  }
}

loadLocalEnv();
const port = Number(process.env.PORT ?? 8787);
const categories = ['Electronics', 'Home & Kitchen', 'Fashion', 'Gaming', 'Beauty', 'Sports & Outdoors', 'Toys & Kids', 'Automotive', 'Pets'];
let client;
const responseCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getClient() {
  if (!client) client = new ScavioClient({ apiKey: process.env.SCAVIO_API_KEY, baseUrl: process.env.SCAVIO_BASE_URL });
  return client;
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

async function cachedDeals(cacheKey, load) {
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.deals;
  const deals = await load();
  responseCache.set(cacheKey, { deals, expiresAt: Date.now() + CACHE_TTL_MS });
  return deals;
}

async function handle(request, response) {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  try {
    if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
    if (url.pathname === '/api/health') return sendJson(response, 200, { scavioConfigured: Boolean(process.env.SCAVIO_API_KEY), baseUrlConfigured: Boolean(process.env.SCAVIO_BASE_URL || 'https://api.scavio.dev') });
    if (url.pathname === '/api/categories') return sendJson(response, 200, { categories });

    const productMatch = url.pathname.match(/^\/api\/deals\/([^/]+)$/);
    if (productMatch) {
      const catalogId = decodeURIComponent(productMatch[1]).replace(/^scavio-google-shopping:/, '');
      const query = url.searchParams.get('query') ?? catalogId;
      const deals = await cachedDeals(`product:${catalogId}:${query}`, async () => {
        const payload = await getClient().shoppingProduct({ catalogId, query });
        return mapShoppingProductResponse(payload, 'Electronics');
      });
      return sendJson(response, 200, { deals });
    }

    if (url.pathname !== '/api/deals') return sendJson(response, 404, { error: 'Not found' });
    const query = url.searchParams.get('query')?.trim();
    const category = url.searchParams.get('category') ?? 'Electronics';
    const featured = url.searchParams.get('featured') === 'true';
    const searchQuery = query || (featured ? 'best deals electronics home kitchen fashion gaming' : `${category} deals`);
    const cacheKey = `search:${searchQuery}:${category}`;
    const deals = await cachedDeals(cacheKey, async () => {
      const payload = await getClient().shoppingSearch({ query: searchQuery, onSale: false });
      return mapShoppingResponse(payload, category);
    });
    return sendJson(response, 200, { deals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Scavio failure';
    const status = message.includes('HTTP 429') ? 429 : message.includes('timed out') ? 504 : 502;
    console.error('[dealhunter-api]', message);
    return sendJson(response, status, { error: status === 429 ? 'Scavio rate limit reached' : status === 504 ? 'Scavio request timed out' : 'Deal data is temporarily unavailable' });
  }
}

createServer((request, response) => { void handle(request, response); }).listen(port, () => {
  console.log(`[dealhunter-api] listening on port ${port}`);
});