export type ShopCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type ShopCart = {
  vendorId: string;
  vendorName: string;
  serviceId: string;
  serviceName: string;
  city: string;
  addressLine: string;
  items: ShopCartItem[];
};

const CART_KEY = "servicego-shop-cart";

function notifyCartUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("servicego-cart-updated"));
}

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readShopCart(): ShopCart | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(CART_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ShopCart;
  } catch {
    window.localStorage.removeItem(CART_KEY);
    return null;
  }
}

export function writeShopCart(cart: ShopCart) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  notifyCartUpdated();
}

export function clearShopCart() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(CART_KEY);
  notifyCartUpdated();
}

export function initializeShopCart(cart: ShopCart) {
  writeShopCart(cart);
  return cart;
}

export function addCartItem(item: Omit<ShopCartItem, "quantity"> & { quantity?: number }) {
  const cart = readShopCart();
  if (!cart) {
    return null;
  }

  const existing = cart.items.find((entry) => entry.id === item.id);
  if (existing) {
    existing.quantity += item.quantity ?? 1;
  } else {
    cart.items.push({ ...item, quantity: item.quantity ?? 1 });
  }

  writeShopCart(cart);
  return cart;
}

export function updateCartItemQuantity(itemId: string, quantity: number) {
  const cart = readShopCart();
  if (!cart) {
    return null;
  }

  cart.items = cart.items
    .map((item) => (item.id === itemId ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);

  writeShopCart(cart);
  return cart;
}

export function getCartTotal(cart: ShopCart | null) {
  if (!cart) {
    return 0;
  }

  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
