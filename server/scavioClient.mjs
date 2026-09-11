const DEFAULT_BASE_URL = 'https://api.scavio.dev';
const REQUEST_TIMEOUT_MS = 90000;
const MIN_REQUEST_INTERVAL_MS = 1100;

export class ScavioClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL } = {}) {
    if (!apiKey) throw new Error('SCAVIO_API_KEY is not configured');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.lastRequestAt = 0;
  }

  async shoppingSearch({ query, onSale = false }) {
    return this.post('/api/v2/google/shopping', { query, ...(onSale ? { on_sale: true } : {}), gl: 'us', hl: 'en', device: 'mobile' });
  }

  async shoppingProduct({ catalogId, query, priority = false }) {
    return this.post('/api/v2/google/shopping/product', { catalog_id: catalogId, query, load_all_stores: true, gl: 'us', hl: 'en', device: 'mobile' }, { priority });
  }

  async walmartSearch({ query }) {
    return this.post('/api/v1/walmart/search', { query, domain: 'com' });
  }

  post(path, body, { priority = false } = {}) {
    return new Promise((resolve, reject) => {
      const request = { path, body, resolve, reject, priority };
      if (priority) {
        const firstNormalIndex = this.requestQueue.findIndex((entry) => !entry.priority);
        if (firstNormalIndex === -1) this.requestQueue.push(request);
        else this.requestQueue.splice(firstNormalIndex, 0, request);
      } else {
        this.requestQueue.push(request);
      }
      void this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    while (this.requestQueue.length) {
      const request = this.requestQueue.shift();
      try {
        request.resolve(await this.postNow(request.path, request.body));
      } catch (error) {
        request.reject(error);
      }
    }
    this.isProcessingQueue = false;
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
