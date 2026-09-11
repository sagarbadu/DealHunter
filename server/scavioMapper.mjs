const categoryNames = new Set([
  'Electronics', 'Home & Kitchen', 'Fashion', 'Gaming', 'Beauty',
  'Sports & Outdoors', 'Toys & Kids', 'Automotive', 'Pets',
]);

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() ?? '';
}

function retailerName(value) {
  const name = typeof value === 'object' && value !== null
    ? firstString(value.name, value.title, value.store_name, value.retailer, value.domain)
    : firstString(value, 'Online retailer');
  if (/walmart/i.test(name)) return 'Walmart';
  if (/amazon/i.test(name)) return 'Amazon';
  if (/target/i.test(name)) return 'Target';
  if (/best buy/i.test(name)) return 'Best Buy';
  if (/ebay/i.test(name)) return 'eBay';
  return name;
}

function imageUrl(row) {
  return firstString(row.thumbnail, row.image, row.image_url, row.product_image, row.product_image_url);
}

function isGoogleUrl(value) {
  return /(^|\.)google\.[^/]+/i.test(value)
    || /(^|\.)gstatic\.com/i.test(value)
    || /(^|\.)googleusercontent\.com/i.test(value)
    || /google\.[^/]+\/shopping/i.test(value);
}

function isRetailerSearchUrl(value) {
  return /walmart\.com\/search|target\.com\/s\?|amazon\.com\/s\?|bestbuy\.com\/site\/searchpage|ebay\.com\/sch/i.test(value);
}

function directProductUrl(row) {
  // Product-detail responses are mapped one store at a time, so `link` keeps
  // the retailer identity and exact offer URL from product_results.stores[].
  const candidates = [row.link, row.product_link, row.offer_link, row.product_url, row.url, row.href];
  return firstString(...candidates.filter((value) => typeof value === 'string' && /^https?:\/\//i.test(value) && !isGoogleUrl(value) && !isRetailerSearchUrl(value)));
}

function retailerSearchUrl(storeName, name) {
  const query = encodeURIComponent(name);
  if (/walmart/i.test(storeName)) return `https://www.walmart.com/search?q=${query}`;
  if (/target/i.test(storeName)) return `https://www.target.com/s?searchTerm=${query}`;
  if (/amazon/i.test(storeName)) return `https://www.amazon.com/s?k=${query}`;
  if (/best buy/i.test(storeName)) return `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`;
  if (/ebay/i.test(storeName)) return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
  if (/geekom/i.test(storeName)) return `https://www.geekompc.com/?s=${query}`;
  if (/arcade1up/i.test(storeName)) return `https://arcade1up.com/search?q=${query}`;
  if (/^[a-z0-9-]+\.[a-z]{2,}$/i.test(storeName)) return `https://${storeName}/?s=${query}`;
  return '';
}

function inferCategory(row, fallbackCategory) {
  const text = [row.category, row.product_type, row.title, row.name].filter(Boolean).join(' ').toLowerCase();
  if (/tv|television|headphone|earbud|laptop|tablet|phone|camera|monitor|keyboard/.test(text)) return 'Electronics';
  if (/kitchen|bowl|mixer|cookware|fryer|vacuum|furniture|home|bed|lamp/.test(text)) return 'Home & Kitchen';
  if (/shirt|shoe|dress|jacket|fashion|jean/.test(text)) return 'Fashion';
  if (/game|console|playstation|xbox|nintendo/.test(text)) return 'Gaming';
  if (/makeup|beauty|serum|skincare|cosmetic/.test(text)) return 'Beauty';
  if (/camp|hiking|fitness|sport|outdoor|bicycle/.test(text)) return 'Sports & Outdoors';
  if (/toy|lego|kids|child/.test(text)) return 'Toys & Kids';
  if (/car|auto|vehicle|tire/.test(text)) return 'Automotive';
  if (/pet|dog|cat/.test(text)) return 'Pets';
  return fallbackCategory;
}

function mapRow(row, category = 'Electronics') {
  if (!row || typeof row !== 'object') return null;
  const name = firstString(row.title, row.name);
  const currentPrice = asNumber(row.extracted_price ?? row.price);
  if (!name || currentPrice === null || currentPrice < 0) return null;

  const originalPrice = asNumber(row.extracted_old_price ?? row.old_price ?? row.list_price);
  const hasDiscount = originalPrice !== null && originalPrice > currentPrice;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const normalizedCategory = inferCategory(row, categoryNames.has(category) ? category : 'Electronics');
  const catalogId = firstString(row.catalog_id, row.product_id);
  if (!catalogId) return null;
  const resolvedImageUrl = imageUrl(row) || 'https://placehold.co/800x600/png?text=DealHunter';
  const retailerValue = row.source ?? row.seller ?? row.store ?? row.merchant ?? row.merchant_name ?? row.seller_name ?? row.retailer ?? row.name;
  const storeName = retailerName(retailerValue);
  const verifiedProductUrl = directProductUrl(row);
  const resolvedProductUrl = verifiedProductUrl || retailerSearchUrl(storeName, name);
  if (!resolvedProductUrl) return null;

  return {
    id: `scavio-google-shopping:${catalogId}`,
    name,
    brand: firstString(row.brand, row.manufacturer, name.split(' ')[0]),
    category: normalizedCategory,
    subcategory: firstString(row.category, row.product_type) || undefined,
    storeName,
    imageUrl: resolvedImageUrl,
    originalPrice: hasDiscount ? originalPrice : null,
    currentPrice,
    discountPercent,
    dealScore: Math.min(99, 60 + Math.round(discountPercent * 0.6)),
    productUrl: resolvedProductUrl,
    productUrlIsDirect: Boolean(verifiedProductUrl),
    availability: /out of stock|unavailable/i.test(firstString(row.availability, row.delivery)) ? 'Limited stock' : 'In stock',
    description: firstString(row.snippet, row.description, `${name} from ${storeName}.`),
    lastUpdated: new Date().toISOString(),
  };
}

export function mapShoppingResponse(payload, category) {
  const rows = Array.isArray(payload?.shopping_results) ? payload.shopping_results : [];
  return rows.map((row) => mapRow(row, category)).filter(Boolean);
}

export function mapShoppingProductResponse(payload, category) {
  const product = payload?.product_results;
  const rows = Array.isArray(product?.stores)
    ? product.stores.map((store) => ({ ...store, title: firstString(product.title, store.title), catalog_id: firstString(product.product_id, product.catalog_id, store.catalog_id) }))
    : Array.isArray(payload?.shopping_results)
      ? payload.shopping_results
      : payload && typeof payload === 'object' && (payload.title || payload.name)
        ? [payload]
        : [];
  return rows.map((row) => mapRow(row, category)).filter(Boolean);
}
