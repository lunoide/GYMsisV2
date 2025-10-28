// Funciones auxiliares
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * Utility function to combine class names conditionally
 * Uses clsx for conditional classes and tailwind-merge to handle Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}