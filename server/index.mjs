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
const inFlightRequests = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_SEARCH_QUERY_LENGTH = 200;
const rateLimitBuckets = new Map();
let lastRateLimitCleanupAt = 0;

function getClient() {
  if (!client) client = new ScavioClient({ apiKey: process.env.SCAVIO_API_KEY, baseUrl: process.env.SCAVIO_BASE_URL });
  return client;
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

function isRetailerSearchUrl(value) {
  return /walmart\.com\/search|target\.com\/s\?|amazon\.com\/s\?|bestbuy\.com\/site\/searchpage|ebay\.com\/sch/i.test(value);
}

function isDirectStoreLink(value) {
  return /^https?:\/\//i.test(value) && !/google|gstatic/i.test(value) && !isRetailerSearchUrl(value);
}

function clientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return forwardedValue?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown';
}

function isRateLimited(request) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  if (now - lastRateLimitCleanupAt >= RATE_LIMIT_WINDOW_MS) {
    for (const [ip, timestamps] of rateLimitBuckets) {
      if (!timestamps.some((timestamp) => timestamp > cutoff)) rateLimitBuckets.delete(ip);
    }
    lastRateLimitCleanupAt = now;
  }

  const ip = clientIp(request);
  const timestamps = (rateLimitBuckets.get(ip) ?? []).filter((timestamp) => timestamp > cutoff);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitBuckets.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitBuckets.set(ip, timestamps);
  return false;
}

async function cachedDeals(cacheKey, load) {
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.deals;
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) return inFlight;

  const request = Promise.resolve()
    .then(load)
    .then((deals) => {
      responseCache.set(cacheKey, { deals, expiresAt: Date.now() + CACHE_TTL_MS });
      return deals;
    });
  inFlightRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    if (inFlightRequests.get(cacheKey) === request) inFlightRequests.delete(cacheKey);
  }
}

async function handle(request, response) {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  try {
    if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
    if (url.pathname === '/api/health') return sendJson(response, 200, { scavioConfigured: Boolean(process.env.SCAVIO_API_KEY), baseUrlConfigured: Boolean(process.env.SCAVIO_BASE_URL || 'https://api.scavio.dev') });
    if (url.pathname === '/api/categories') return sendJson(response, 200, { categories });

    const productMatch = url.pathname.match(/^\/api\/deals\/([^/]+)$/);
    const canTriggerProviderRequest = Boolean(productMatch) || url.pathname === '/api/deals' || url.pathname === '/api/resolve-product-url';
    if (canTriggerProviderRequest && isRateLimited(request)) {
      return sendJson(response, 429, { error: 'Too many requests. Please try again shortly.' });
    }

    if (productMatch) {
      const catalogId = decodeURIComponent(productMatch[1]).replace(/^scavio-google-shopping:/, '');
      const query = url.searchParams.get('query') ?? catalogId;
      const deals = await cachedDeals(`product:${catalogId}:${query}`, async () => {
        const payload = await getClient().shoppingProduct({ catalogId, query });
        return mapShoppingProductResponse(payload, 'Electronics');
      });
      return sendJson(response, 200, { deals });
    }

    if (url.pathname === '/api/resolve-product-url') {
      const id = url.searchParams.get('id')?.trim() ?? '';
      const name = url.searchParams.get('name')?.trim() ?? '';
      const store = url.searchParams.get('store')?.trim().toLowerCase() ?? '';
      const catalogId = id.replace(/^scavio-google-shopping:/, '');
      if (!catalogId) return sendJson(response, 200, { url: null });

      const stores = await cachedDeals(`stores:${catalogId}`, async () => {
        const payload = await getClient().shoppingProduct({ catalogId, query: name || catalogId, priority: true });
        const list = payload?.product_results?.stores;
        return Array.isArray(list) ? list.map((storeRow) => ({ name: String(storeRow?.name ?? ''), link: String(storeRow?.link ?? ''), price: storeRow?.price ?? null })) : [];
      });

      const preferred = store ? stores.find((entry) => entry.name.toLowerCase().includes(store) && isDirectStoreLink(entry.link)) : null;
      const fallback = store ? null : stores.find((entry) => isDirectStoreLink(entry.link));
      return sendJson(response, 200, { url: (preferred ?? fallback)?.link ?? null });
    }

    if (url.pathname !== '/api/deals') return sendJson(response, 404, { error: 'Not found' });
    const query = url.searchParams.get('query')?.trim();
    if (query && query.length > MAX_SEARCH_QUERY_LENGTH) {
      return sendJson(response, 400, { error: 'Search query must be 200 characters or fewer.' });
    }
    const category = url.searchParams.get('category') ?? 'Electronics';
    const featured = url.searchParams.get('featured') === 'true';
    const searchQuery = query || (featured ? 'tv laptop headphones air fryer gaming console vacuum coffee maker' : `${category} deals`);
    const cacheKey = `search:${searchQuery}:${category}`;
    const deals = await cachedDeals(cacheKey, async () => {
      const payload = await getClient().shoppingSearch({ query: searchQuery, onSale: false });
      const mappedDeals = mapShoppingResponse(payload, category);
      const shoppingResults = payload?.shopping_results;
      console.info('[SCAVIO_DIAGNOSTIC]', {
        shoppingResultsIsArray: Array.isArray(shoppingResults),
        shoppingResultsCount: Array.isArray(shoppingResults) ? shoppingResults.length : 0,
        topLevelKeys: Object.keys(payload ?? {}),
        mappedDealCount: mappedDeals.length,
      });
      return mappedDeals;
    });
    if (url.searchParams.has('category')) {
      console.info(`[dealhunter-api] category=${category} query=${JSON.stringify(searchQuery)} deals=${deals.length}`);
    }
    return sendJson(response, 200, { deals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Scavio failure';
    const status = message.includes('HTTP 429') ? 429 : message.includes('timed out') ? 504 : 502;
    console.error('[dealhunter-api]', request.method, url.pathname, message);
    return sendJson(response, status, { error: status === 429 ? 'Scavio rate limit reached' : status === 504 ? 'Scavio request timed out' : 'Deal data is temporarily unavailable' });
  }
}

createServer((request, response) => { void handle(request, response); }).listen(port, () => {
  console.log(`[dealhunter-api] listening on port ${port}`);
});
