import { PRODUCTS } from '@/data/products';

/**
 * Get the best available image source for a product.
 * Priority: image_data (base64) → image_url → static fallback → null
 */
export function getProductImageSrc(product: {
  id?: string;
  product_key?: string;
  image_url?: string;
  image_data?: string;
}): string | null {
  if (product.image_data) return `data:image/jpeg;base64,${product.image_data}`;
  if (product.image_url) return product.image_url;
  const key = product.id || product.product_key;
  if (key) {
    const staticProduct = PRODUCTS[key];
    if (staticProduct?.image_url) return staticProduct.image_url;
  }
  return null;
}
