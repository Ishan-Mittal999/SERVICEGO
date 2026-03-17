export type SavedAddress = {
  id: string;
  label: string;
  city: string;
  addressLine: string;
  isDefault?: boolean;
  createdAt: string;
};

const ADDRESS_BOOK_KEY = "servicego-address-book";
const CITY_KEY = "servicego-selected-city";

function canUseStorage() {
  return typeof window !== "undefined";
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readAddressBook(): SavedAddress[] {
  if (!canUseStorage()) {
    return [];
  }

  const parsed = safeParse<SavedAddress[]>(window.localStorage.getItem(ADDRESS_BOOK_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function writeAddressBook(addresses: SavedAddress[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(addresses));
}

export function saveAddress(address: Omit<SavedAddress, "id" | "createdAt"> & { id?: string }) {
  const current = readAddressBook();
  const nextId = address.id ?? `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const nextAddress: SavedAddress = {
    id: nextId,
    createdAt: new Date().toISOString(),
    label: address.label.trim(),
    city: address.city.trim(),
    addressLine: address.addressLine.trim(),
    isDefault: Boolean(address.isDefault),
  };

  let updated = current.filter((item) => item.id !== nextId);

  if (nextAddress.isDefault) {
    updated = updated.map((item) => ({ ...item, isDefault: false }));
  }

  updated.unshift(nextAddress);

  if (!updated.some((item) => item.isDefault) && updated.length > 0) {
    updated[0] = { ...updated[0], isDefault: true };
  }

  writeAddressBook(updated);
  return updated;
}

export function removeAddress(addressId: string) {
  const current = readAddressBook();
  const updated = current.filter((item) => item.id !== addressId);

  if (updated.length > 0 && !updated.some((item) => item.isDefault)) {
    updated[0] = { ...updated[0], isDefault: true };
  }

  writeAddressBook(updated);
  return updated;
}

export function setDefaultAddress(addressId: string) {
  const current = readAddressBook();
  const updated = current.map((item) => ({
    ...item,
    isDefault: item.id === addressId,
  }));
  writeAddressBook(updated);
  return updated;
}

export function getDefaultAddress() {
  const addresses = readAddressBook();
  return addresses.find((item) => item.isDefault) ?? addresses[0] ?? null;
}

export function readSelectedCity() {
  if (!canUseStorage()) {
    return "";
  }
  return window.localStorage.getItem(CITY_KEY) ?? "";
}

export function writeSelectedCity(city: string) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(CITY_KEY, city.trim());
}
