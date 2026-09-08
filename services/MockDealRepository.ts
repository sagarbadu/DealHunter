import { categories, extremeDeals, mockDeals } from '@/data/mockDeals';
import type { DealCategory, Product } from '@/types/product';
import type { DealRepository } from '@/services/DealRepository';

export class MockDealRepository implements DealRepository {
  async getFeaturedDeals(): Promise<Product[]> {
    return [...extremeDeals].sort((first, second) => second.discountPercent - first.discountPercent || second.dealScore - first.dealScore);
  }

  async getDealsByCategory(category: DealCategory): Promise<Product[]> {
    return mockDeals.filter((product) => product.category === category);
  }

  async getCategories(): Promise<DealCategory[]> {
    return categories;
  }

  async searchDeals(query: string): Promise<Product[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];

    return mockDeals.filter((product) => [
      product.name,
      product.storeName,
      product.category,
      product.subcategory,
    ].some((field) => field?.toLocaleLowerCase().includes(normalizedQuery)));
  }

  async getDealById(id: string): Promise<Product | null> {
    return mockDeals.find((product) => product.id === id) ?? null;
  }
}

export const dealRepository: DealRepository = new MockDealRepository();