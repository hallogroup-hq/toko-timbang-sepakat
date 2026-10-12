import { CartItem } from './types.ts';

const CART_KEY = 'tts_cart_v1';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.optionId === 'string' &&
        typeof item.productId === 'string' &&
        typeof item.priceIdr === 'number' &&
        typeof item.qty === 'number' &&
        item.qty > 0
    );
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    notify();
  } catch (err) {
    console.error('Failed to save cart to localStorage', err);
  }
}

export function addToCart(
  item: Omit<CartItem, 'qty'>,
  qtyToAdd: number = 1
): void {
  const cart = getCart();
  const existingIdx = cart.findIndex((i) => i.optionId === item.optionId);

  if (existingIdx >= 0) {
    cart[existingIdx].qty = Math.min(99999, cart[existingIdx].qty + qtyToAdd);
    // Update price if refreshed
    cart[existingIdx].priceIdr = item.priceIdr;
    cart[existingIdx].unitLabel = item.unitLabel;
    cart[existingIdx].productName = item.productName;
  } else {
    cart.push({
      productId: item.productId,
      optionId: item.optionId,
      productName: item.productName,
      unitLabel: item.unitLabel,
      priceIdr: item.priceIdr,
      qty: Math.max(1, Math.min(99999, qtyToAdd))
    });
  }

  saveCart(cart);
}

export function updateCartQty(optionId: string, newQty: number): void {
  const cart = getCart();
  const idx = cart.findIndex((i) => i.optionId === optionId);
  if (idx >= 0) {
    if (newQty <= 0) {
      cart.splice(idx, 1);
    } else {
      cart[idx].qty = Math.min(99999, Math.floor(newQty));
    }
    saveCart(cart);
  }
}

export function removeFromCart(optionId: string): void {
  const cart = getCart().filter((i) => i.optionId !== optionId);
  saveCart(cart);
}

export function clearCart(): void {
  saveCart([]);
}

export function getCartCount(): number {
  return getCart().reduce((acc, item) => acc + item.qty, 0);
}

export function getCartSubtotal(): number {
  return getCart().reduce((acc, item) => acc + item.qty * item.priceIdr, 0);
}

export function subscribeToCart(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
