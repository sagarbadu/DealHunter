import type { DealCategory, Product } from '@/types/product';

export interface DealRepository {
  getFeaturedDeals(): Promise<Product[]>;
  getDealsByCategory(category: DealCategory): Promise<Product[]>;
  getCategories(): Promise<DealCategory[]>;
  searchDeals(query: string): Promise<Product[]>;
  getDealById(id: string, query?: string): Promise<Product | null>;
}
