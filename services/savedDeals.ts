import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/types/product';

const STORAGE_KEY = '@dealhunter/saved-products';
const listeners = new Set<() => void>();
const savedProducts = new Map<string, Product>();
let initialized = false;
let initialization: Promise<void> | null = null;

async function initializeSavedDeals(): Promise<void> {
  if (initialized) return;
  if (!initialization) {
    initialization = AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) return;
        const products = JSON.parse(value) as Product[];
        if (Array.isArray(products)) {
          products.forEach((product) => {
            if (product?.id) savedProducts.set(product.id, product);
          });
        }
      })
      .catch(() => undefined)
      .then(() => { initialized = true; });
  }
  await initialization;
}

async function persistSavedDeals(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...savedProducts.values()]));
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeToSavedDeals(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isDealSaved(productId: string): boolean {
  return savedProducts.has(productId);
}

export async function getSavedDeals(): Promise<Product[]> {
  await initializeSavedDeals();
  return [...savedProducts.values()];
}

export async function toggleDealSaved(product: Product): Promise<boolean> {
  await initializeSavedDeals();
  if (savedProducts.has(product.id)) {
    savedProducts.delete(product.id);
  } else {
    savedProducts.set(product.id, product);
  }

  await persistSavedDeals();
  notifyListeners();
  return savedProducts.has(product.id);
}