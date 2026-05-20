import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize list API payloads: arrays, `{ data: [] }`, `{ items: [] }`, or invalid
 * bodies (e.g. HTML from SPA fallback when /api is not deployed).
 */
export function coerceApiList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.items)) return o.items as T[];
  }
  return [];
}

/** @alias coerceApiList */
export const ensureArray = coerceApiList;

/** Paginated list responses `{ items, total }`. */
export function ensureListItems<T>(value: unknown): T[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return coerceApiList(value);
}
