import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Guard API/cache payloads that are not arrays (e.g. HTML error bodies from SPA fallback). */
export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/** Guard paginated list payloads `{ items, total }` when the body is malformed. */
export function ensureListItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
}
