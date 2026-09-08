const DEFAULT_BASE_URL = 'https://api.scavio.dev';
const REQUEST_TIMEOUT_MS = 90000;
const MIN_REQUEST_INTERVAL_MS = 1100;

export class ScavioClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL } = {}) {
    if (!apiKey) throw new Error('SCAVIO_API_KEY is not configured');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.requestQueue = Promise.resolve();
    this.lastRequestAt = 0;
  }

  async shoppingSearch({ query, onSale = false }) {
    return this.post('/api/v2/google/shopping', { query, ...(onSale ? { on_sale: true } : {}), gl: 'us', hl: 'en', device: 'mobile' });
  }

  async shoppingProduct({ catalogId, query }) {
    return this.post('/api/v2/google/shopping/product', { catalog_id: catalogId, query, load_all_stores: true, gl: 'us', hl: 'en', device: 'mobile' });
  }

  async post(path, body) {
    const request = this.requestQueue.then(() => this.postNow(path, body));
    this.requestQueue = request.catch(() => undefined);
    return request;
  }

  async postNow(path, body) {
    const waitFor = MIN_REQUEST_INTERVAL_MS - (Date.now() - this.lastRequestAt);
    if (waitFor > 0) await new Promise((resolve) => setTimeout(resolve, waitFor));
    this.lastRequestAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`Scavio request failed with HTTP ${response.status}`);
      }
      if (!payload || typeof payload !== 'object') {
        throw new Error('Scavio returned a malformed response');
      }
      return payload;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Scavio request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}