const savedProductIds = new Set<string>();

export function isDealSaved(productId: string): boolean {
  return savedProductIds.has(productId);
}

export function toggleDealSaved(productId: string): boolean {
  if (savedProductIds.has(productId)) {
    savedProductIds.delete(productId);
    return false;
  }

  savedProductIds.add(productId);
  return true;
}