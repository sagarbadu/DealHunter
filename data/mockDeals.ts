import type { DealCategory, Product } from '@/types/product';

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=85`;

export const categories: DealCategory[] = [
  'Electronics', 'Home & Kitchen', 'Fashion', 'Gaming', 'Beauty',
  'Sports & Outdoors', 'Toys & Kids', 'Automotive', 'Pets',
];

export const mockDeals: Product[] = [
  { id: 'sony-xm5', name: 'WH-1000XM5 Wireless Headphones', brand: 'Sony', category: 'Electronics', subcategory: 'Audio', storeName: 'Best Buy', imageUrl: image('photo-1505740420928-5e560c06d30e'), originalPrice: 399.99, currentPrice: 199.99, discountPercent: 50, dealScore: 94, productUrl: 'https://example.com/deals/sony-xm5', availability: 'In stock', description: 'Premium noise-cancelling wireless headphones.', lastUpdated: 'Today' },
  { id: 'ipad-air', name: 'iPad Air 11-inch Wi-Fi', brand: 'Apple', category: 'Electronics', subcategory: 'Tablets', storeName: 'Walmart', imageUrl: image('photo-1544244015-0df4b3ffc6b0'), originalPrice: 599.99, currentPrice: 449.99, discountPercent: 25, dealScore: 89, productUrl: 'https://example.com/deals/ipad-air', availability: 'In stock', description: 'Versatile tablet for work, creativity, and entertainment.', lastUpdated: 'Today' },
  { id: 'air-fryer', name: 'Digital Air Fryer, 6 Quart', brand: 'Ninja', category: 'Home & Kitchen', subcategory: 'Appliances', storeName: 'Target', imageUrl: image('photo-1585515320310-259814833e62'), originalPrice: 149.99, currentPrice: 79.99, discountPercent: 47, dealScore: 91, productUrl: 'https://example.com/deals/air-fryer', availability: 'In stock', description: 'Crisp, quick meals with less oil and less cleanup.', lastUpdated: 'Today' },
  { id: 'linen-shirt', name: 'Relaxed Linen Blend Shirt', brand: 'Goodfellow', category: 'Fashion', subcategory: 'Menswear', storeName: 'Target', imageUrl: image('photo-1529139574466-a303027c1d8b'), originalPrice: 39.99, currentPrice: 19.99, discountPercent: 50, dealScore: 86, productUrl: 'https://example.com/deals/linen-shirt', availability: 'In stock', description: 'Lightweight everyday shirt with a relaxed fit.', lastUpdated: 'Today' },
  { id: 'switch-oled', name: 'Nintendo Switch OLED Console', brand: 'Nintendo', category: 'Gaming', subcategory: 'Consoles', storeName: 'Amazon', imageUrl: image('photo-1606144042614-b2417e99c4e3'), originalPrice: 349.99, currentPrice: 279.99, discountPercent: 20, dealScore: 88, productUrl: 'https://example.com/deals/switch-oled', availability: 'Limited stock', description: 'A vibrant handheld and home gaming console.', lastUpdated: 'Today' },
  { id: 'vitamin-c', name: 'Vitamin C Brightening Serum', brand: 'CeraVe', category: 'Beauty', subcategory: 'Skincare', storeName: 'Walmart', imageUrl: image('photo-1556228720-195a672e8a03'), originalPrice: 24.99, currentPrice: 12.49, discountPercent: 50, dealScore: 84, productUrl: 'https://example.com/deals/vitamin-c', availability: 'In stock', description: 'A daily brightening serum for a simple skincare routine.', lastUpdated: 'Today' },
  { id: 'camping-chair', name: 'Ultralight Portable Camp Chair', brand: 'Ozark Trail', category: 'Sports & Outdoors', subcategory: 'Camping', storeName: 'Walmart', imageUrl: image('photo-1523987355523-c7b5b0dd90a7'), originalPrice: 59.99, currentPrice: 29.99, discountPercent: 50, dealScore: 87, productUrl: 'https://example.com/deals/camping-chair', availability: 'In stock', description: 'Packable comfort for campsites, parks, and events.', lastUpdated: 'Today' },
  { id: 'lego-city', name: 'City Fire Station Building Set', brand: 'LEGO', category: 'Toys & Kids', subcategory: 'Building Sets', storeName: 'eBay', imageUrl: image('photo-1587654780291-39c9404d746b'), originalPrice: 99.99, currentPrice: 64.99, discountPercent: 35, dealScore: 82, productUrl: 'https://example.com/deals/lego-city', availability: 'Limited stock', description: 'A creative building set for imaginative city play.', lastUpdated: 'Today' },
  { id: 'car-vacuum', name: 'Cordless Handheld Car Vacuum', brand: 'Black+Decker', category: 'Automotive', subcategory: 'Car Care', storeName: 'Amazon', imageUrl: image('photo-1558317374-067fb5f30001'), originalPrice: 79.99, currentPrice: 39.99, discountPercent: 50, dealScore: 83, productUrl: 'https://example.com/deals/car-vacuum', availability: 'In stock', description: 'Compact cordless cleaning for quick car touch-ups.', lastUpdated: 'Today' },
  { id: 'pet-bed', name: 'Orthopedic Memory Foam Pet Bed', brand: 'FurHaven', category: 'Pets', subcategory: 'Beds', storeName: 'Amazon', imageUrl: image('photo-1548199973-03cce0bbc87b'), originalPrice: 69.99, currentPrice: 41.99, discountPercent: 40, dealScore: 80, productUrl: 'https://example.com/deals/pet-bed', availability: 'In stock', description: 'Supportive memory foam comfort for restful pet naps.', lastUpdated: 'Today' },
];

export const extremeDeals = mockDeals.filter((product) => product.dealScore >= 90);

export const dealsForCategory = (category: DealCategory) =>
  mockDeals.filter((product) => product.category === category);
