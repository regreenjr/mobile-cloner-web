import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a UUID v4
 * @returns A random UUID string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
