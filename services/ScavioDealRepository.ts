import type { DealCategory, Product } from '@/types/product';
import type { DealRepository } from '@/services/DealRepository';

type DealsResponse = { deals?: Product[] };
type SearchCacheEntry = { deals: Product[]; expiresAt: number };
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

const apiBaseUrl = process.env.EXPO_PUBLIC_DEAL_API_URL?.replace(/\/+$/, '');

async function getJson<T>(path: string): Promise<T> {
  if (!apiBaseUrl) throw new Error('EXPO_PUBLIC_DEAL_API_URL is not configured');
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Deal proxy failed with HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function dealsFrom(response: DealsResponse): Product[] {
  return Array.isArray(response.deals) ? response.deals : [];
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export class ScavioDealRepository implements DealRepository {
  private catalogPromise: Promise<Product[]> | null = null;
  private searchCache = new Map<string, SearchCacheEntry>();

  private async getCatalog(): Promise<Product[]> {
    if (!this.catalogPromise) {
      this.catalogPromise = getJson<DealsResponse>('/api/deals?featured=true')
        .then((response) => {
          const deals = dealsFrom(response);
          if (deals.length === 0) throw new Error('Scavio returned no catalog deals');
          return deals;
        })
        .catch((error) => {
          this.catalogPromise = null;
          throw error;
        });
    }
    return this.catalogPromise;
  }

  async getFeaturedDeals(): Promise<Product[]> {
    const deals = await this.getCatalog();
    return [...deals].sort((first, second) => second.discountPercent - first.discountPercent || second.dealScore - first.dealScore);
  }

  async getDealsByCategory(category: DealCategory): Promise<Product[]> {
    return dealsFrom(await getJson<DealsResponse>(`/api/deals?category=${encodeURIComponent(category)}`));
  }

  async getCategories(): Promise<DealCategory[]> {
    const response = await getJson<{ categories?: DealCategory[] }>('/api/categories');
    return Array.isArray(response.categories) ? response.categories : [];
  }

  async searchDeals(query: string): Promise<Product[]> {
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery) return [];

    const cached = this.searchCache.get(normalizedQuery);
    if (cached && cached.expiresAt > Date.now()) return cached.deals;
    if (cached) this.searchCache.delete(normalizedQuery);

    const deals = dealsFrom(await getJson<DealsResponse>(`/api/deals?query=${encodeURIComponent(normalizedQuery)}`))
      .sort((first, second) => second.discountPercent - first.discountPercent || second.dealScore - first.dealScore);
    if (deals.length > 0) this.searchCache.set(normalizedQuery, { deals, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
    return deals;
  }

  async getDealById(id: string, query?: string): Promise<Product | null> {
    const queryParam = query ? `?query=${encodeURIComponent(query)}` : '';
    const response = await getJson<DealsResponse>(`/api/deals/${encodeURIComponent(id)}${queryParam}`);
    const deals = dealsFrom(response);
    return deals[0] ?? null;
  }
}

export const scavioDealRepository = new ScavioDealRepository();
