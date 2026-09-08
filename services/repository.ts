import type { DealRepository } from '@/services/DealRepository';
import { MockDealRepository } from '@/services/MockDealRepository';
import { scavioDealRepository } from '@/services/ScavioDealRepository';

class FallbackDealRepository implements DealRepository {
  constructor(private readonly primary: DealRepository, private readonly fallback: DealRepository) {}

  private async withFallback<T>(operation: string, action: () => Promise<T>, fallbackAction: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      console.warn(`[dealhunter] ${operation} failed; using mock data`, error instanceof Error ? error.message : 'Unknown error');
      return fallbackAction();
    }
  }

  getFeaturedDeals() { return this.withFallback('featured deals', () => this.primary.getFeaturedDeals(), () => this.fallback.getFeaturedDeals()); }
  getDealsByCategory(category: Parameters<DealRepository['getDealsByCategory']>[0]) { return this.withFallback(`category ${category}`, () => this.primary.getDealsByCategory(category), () => this.fallback.getDealsByCategory(category)); }
  getCategories() { return this.withFallback('categories', () => this.primary.getCategories(), () => this.fallback.getCategories()); }
  searchDeals(query: string) { return this.withFallback(`search ${query}`, () => this.primary.searchDeals(query), () => this.fallback.searchDeals(query)); }
  getDealById(id: string, query?: string) { return this.withFallback(`deal ${id}`, () => this.primary.getDealById(id, query), () => this.fallback.getDealById(id, query)); }
}

const mockRepository = new MockDealRepository();
const useMockFallback = process.env.EXPO_PUBLIC_USE_MOCK_FALLBACK === 'true';

export const dealRepository: DealRepository = process.env.EXPO_PUBLIC_DEAL_API_URL
  ? (useMockFallback ? new FallbackDealRepository(scavioDealRepository, mockRepository) : scavioDealRepository)
  : mockRepository;
