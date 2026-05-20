import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Guard API/cache payloads that are not arrays (e.g. HTML error bodies from SPA fallback). */
export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}
