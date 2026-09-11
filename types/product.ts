export type DealCategory =
  | 'Electronics'
  | 'Home & Kitchen'
  | 'Fashion'
  | 'Gaming'
  | 'Beauty'
  | 'Sports & Outdoors'
  | 'Toys & Kids'
  | 'Automotive'
  | 'Pets';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: DealCategory;
  subcategory?: string;
  storeName: string;
  imageUrl: string;
  originalPrice: number | null;
  currentPrice: number;
  discountPercent: number;
  dealScore: number;
  productUrl: string;
  productUrlIsDirect?: boolean;
  availability: string;
  description: string;
  lastUpdated: string;
}
